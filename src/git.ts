import Debug from 'debug'
import diff from 'deep-diff'
import { rmSync } from 'fs'
import { copy, ensureDir, pathExists, readFile, writeFile } from 'fs-extra'
import { unlink } from 'fs/promises'
import { glob } from 'glob'
import { merge } from 'lodash'
import { basename, dirname, join } from 'path'
import simpleGit, { CheckRepoActions, CleanOptions, CommitResult, ResetMode, SimpleGit } from 'simple-git'
import { cleanEnv, GIT_LOCAL_PATH, GIT_PASSWORD, GIT_PUSH_RETRIES } from 'src/validators'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { GitPullError } from './error'
import { Core, GitConfig } from './otomi-models'
import { getSanitizedErrorMessage, removeBlankAttributes, sanitizeGitPassword } from './utils'
import { getAuthenticatedUrl, getProtocol, getUrl } from './git/connect'

const debug = Debug('otomi:repo')

const env = cleanEnv({
  GIT_LOCAL_PATH,
  GIT_PASSWORD,
  GIT_PUSH_RETRIES,
})

export class Git {
  branch: string
  commitSha: string
  corrupt = false
  email: string
  git: SimpleGit
  path: string
  remote: string
  remoteBranch: string
  url: string | undefined
  urlAuth: string
  user: string

  constructor(path: string, url: string | undefined, user: string, email: string, urlAuth: string, branch: string) {
    this.branch = branch
    this.email = email
    this.path = path
    this.remote = 'origin'
    this.remoteBranch = join(this.remote, this.branch)
    this.urlAuth = urlAuth
    this.user = user
    this.url = url

    const gitSSLNoVerify = getProtocol(url) === 'http'
    this.git = simpleGit(this.path).env('GIT_SSL_NO_VERIFY', String(gitSSLNoVerify))
  }

  async addConfig(): Promise<void> {
    debug(`Adding git config`)
    await this.git.addConfig('user.name', this.user)
    await this.git.addConfig('user.email', this.email)
    if (this.isRootClone()) {
      if (getProtocol(this.url) === 'file') {
        // tell the the git repo there to accept updates even when it is checked out
        const _git = simpleGit(this.url!.replace('file://', ''))
        await _git.addConfig('receive.denyCurrentBranch', 'updateInstead')
      }
      // same for the root repo, which needs to accept pushes from children
      await this.git.addConfig('receive.denyCurrentBranch', 'updateInstead')
    }
  }

  async init(bare = true): Promise<void> {
    await this.git.init(bare !== undefined ? bare : this.isRootClone())
    await this.git.addRemote(this.remote, this.url!)
  }

  getSafePath(file: string): string {
    return file
  }

  async removeFile(file: string): Promise<void> {
    const absolutePath = join(this.path, file)
    const exists = await this.fileExists(file)
    if (exists) {
      debug(`Removing file: ${absolutePath}`)
      await unlink(absolutePath)
    }
  }

  async removeDir(dir: string): Promise<void> {
    const absolutePath = join(this.path, dir)
    const exists = await this.fileExists(dir)
    if (exists) {
      debug(`Removing directory: ${absolutePath}`)
      rmSync(absolutePath, { recursive: true, force: true })
    }
  }

  async diffFile(file: string, data: Record<string, any>): Promise<boolean> {
    const repoFile: string = this.getSafePath(file)
    const oldData = await this.readFile(repoFile)
    const deepDiff = diff(data, oldData)
    debug(`Diff for ${file}: `, deepDiff)
    return deepDiff
  }

  async writeFile(file: string, data: Record<string, unknown>, unsetBlankAttributes = true): Promise<void> {
    let cleanedData = data
    if (unsetBlankAttributes) cleanedData = removeBlankAttributes(data, { emptyArrays: true })
    // we also bail when no changes found
    const hasDiff = await this.diffFile(file, data)
    if (!hasDiff) return
    // ok, write new content
    const absolutePath = join(this.path, file)
    debug(`Writing to file: ${absolutePath}`)
    const content = stringifyYaml(data, undefined, { indent: 4, sortMapEntries: true })
    const dir = dirname(absolutePath)
    await ensureDir(dir)
    await writeFile(absolutePath, content, 'utf8')
  }

  async writeTextFile(file: string, content: string): Promise<void> {
    const absolutePath = join(this.path, file)
    debug(`Writing to file: ${absolutePath}`)
    await ensureDir(dirname(absolutePath))
    await writeFile(absolutePath, content, 'utf8')
  }

  async fileExists(relativePath: string): Promise<boolean> {
    const absolutePath = join(this.path, relativePath)
    return await pathExists(absolutePath)
  }

  async readDir(relativePath: string): Promise<string[]> {
    const absolutePath = join(this.path, relativePath)
    const files = await glob([`${absolutePath}/**/*.yaml`])
    const filenames = files.map((file) => basename(file))
    return filenames
  }

  async readFile(file: string, checkSuffix = false): Promise<Record<string, any>> {
    if (!(await this.fileExists(file))) return {}
    const safeFile = checkSuffix ? this.getSafePath(file) : file
    const absolutePath = join(this.path, safeFile)
    debug(`Reading from file: ${absolutePath}`)
    const doc = parseYaml(await readFile(absolutePath, 'utf8')) || {}
    return doc
  }

  async loadConfig(file: string, secretFile: string): Promise<Core> {
    const data = await this.readFile(file)
    const secretData = await this.readFile(secretFile, true)
    return merge(data, secretData) as Core
  }

  isRootClone(): boolean {
    return this.path === env.GIT_LOCAL_PATH
  }

  hasRemote(): boolean {
    return !!this.url
  }

  async initFromTestFolder(): Promise<void> {
    // we inflate GIT_LOCAL_PATH from the ./test folder
    debug(`DEV mode: using local folder values`)
    await copy(join(process.cwd(), 'test'), env.GIT_LOCAL_PATH, {
      overwrite: false,
    })
    await this.init(false)
    await this.git.checkoutLocalBranch(this.branch)
    await this.git.add('.')
    await this.addConfig()
    await this.git.commit('initial commit', undefined, this.getOptions())
  }

  async clone(): Promise<void> {
    debug(`Checking if local git repository exists at: ${this.path}`)
    const isRepo = await this.git.checkIsRepo(CheckRepoActions.IS_REPO_ROOT)
    if (!isRepo) {
      debug(`Initializing repo...`)
      if (process.env.NODE_ENV === 'development' && !this.hasRemote() && this.isRootClone()) {
        return await this.initFromTestFolder()
      }
      debug(`Cloning from '${this.url}' to '${this.path}'`)
      await this.git.clone(this.urlAuth, this.path)
      await this.addConfig()
      await this.git.checkout(this.branch)
    } else if (this.url) {
      debug('Repo already exists. Checking out correct branch.')
      // Git fetch ensures that local git repository is synced with remote repository
      await this.git.fetch({})
      await this.git.checkout(this.branch)
    }
    this.commitSha = await this.getCommitSha()
  }

  getOptions() {
    const options = {}
    if (env.isDev) options['--no-verify'] = null // only for dev do we have git hooks blocking direct commit
    return options
  }

  async commit(editor: string): Promise<CommitResult> {
    await this.git.add('./*')
    const summary = await this.git.commit(`otomi-api commit by ${editor}`, undefined, this.getOptions())
    debug(`Commit summary: ${JSON.stringify(summary)}`)
    return summary
  }

  async pull(skipRequest = false, skipMsg = false): Promise<any> {
    // test root can't pull as it has no remote
    if (!this.url) return
    debug('Pulling')
    try {
      const summary = await this.git.pull(this.remote, this.branch, { '--rebase': 'true', '--depth': '5' })
      const summJson = JSON.stringify(summary)
      debug(`Pull summary: ${summJson}`)
      this.commitSha = await this.getCommitSha()
    } catch (e) {
      const eMessage = getSanitizedErrorMessage(e)
      debug('Could not pull from remote. Upstream commits? Marked db as corrupt.', eMessage)
      this.corrupt = true
      try {
        // Remove local changes so that no conflict can happen
        debug('Removing local changes.')
        await this.git.reset(ResetMode.HARD)
        if (this.isRootClone()) {
          debug(`Go to ${this.branch} branch`)
          await this.git.checkout(this.branch)
          debug('Removing local changes.')
          await this.git.reset(ResetMode.HARD)
          debug('Cleaning local values and directories.')
          await this.git.clean(CleanOptions.FORCE, ['-d'])
          debug('Get the latest branch from:', this.remote)
          await this.git.fetch(this.remote, this.branch)
          debug('Reconciling divergent branches.')
          await this.git.merge([`${this.remote}/${this.branch}`, '--strategy-option=theirs'])
          debug('Trying to remove upstream commits: ', this.remote)
          await this.git.push([this.remote, this.branch, '--force'])
        } else {
          // Worktree recovery: rebase session branch on top of remote; our changes win conflicts
          debug('Get the latest branch from:', this.remote)
          await this.git.fetch(this.remote, this.branch)
          debug('Rebasing session branch on top of remote.')
          await this.git.raw(['rebase', `${this.remote}/${this.branch}`, '--strategy-option=ours'])
        }
      } catch (error) {
        const errorMessage = getSanitizedErrorMessage(error)
        debug('Failed to remove upstream commits: ', errorMessage)
        throw new GitPullError('Failed to remove upstream commits!')
      }
      debug('Removed upstream commits!')
      this.corrupt = false
    }
  }

  async push(): Promise<any> {
    if (!this.url && this.isRootClone()) return
    debug('Pushing')

    // For worktrees, push current branch (session branch) to main branch
    // For main repo, push normally
    if (!this.isRootClone()) {
      const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD'])
      const summary = await this.git.push([this.remote, `${currentBranch}:${this.branch}`])
      debug('Pushed session branch to main. Summary: ', summary)
    } else {
      // Original push logic for main repo
      const summary = await this.git.push(this.remote, this.branch)
      debug('Pushed. Summary: ', summary)
    }
    return
  }

  async testRemoteConnection(gitConfig: GitConfig): Promise<boolean> {
    const authUrl = getAuthenticatedUrl(gitConfig)
    // returns true only if the configured branch exists on the remote
    const result = await this.git.raw(['ls-remote', authUrl, `refs/heads/${gitConfig.branch}`])
    return result.trim().length > 0
  }

  async pushToNewRemote(newGitConfig: GitConfig): Promise<void> {
    const authUrl = getAuthenticatedUrl(newGitConfig)
    // Pulls use --depth which can leave the clone shallow. A shallow clone cannot be pushed to a
    // fresh empty remote because referenced parent objects are missing. Unshallow first to restore
    // full history; ignore failures when the repo is already complete.
    try {
      await this.git.fetch([this.remote, '--unshallow'])
    } catch {
      debug('Unshallow fetch skipped (repo is not shallow or fetch failed)')
    }
    try {
      await this.git.remote(['add', 'migration-remote', authUrl])
      // Push HEAD so the worktree's session branch commit is included, not the stale local main
      await this.git.push('migration-remote', `HEAD:refs/heads/${newGitConfig.branch}`)
    } finally {
      try {
        await this.git.remote(['remove', 'migration-remote'])
      } catch (e) {
        debug(`Could not remove migration-remote: ${getSanitizedErrorMessage(e)}`)
      }
    }
  }

  async createWorktree(worktreePath: string, branch: string = this.branch): Promise<void> {
    debug(`Creating worktree at: ${worktreePath} from branch: ${branch}`)
    await ensureDir(dirname(worktreePath), { mode: 0o744 })

    // Use sessionId as branch name (from worktree path)
    const sessionId = basename(worktreePath)
    const sessionBranch = sessionId

    // Create worktree with session branch
    await this.git.raw(['worktree', 'add', '-b', sessionBranch, worktreePath, branch])
    debug(`Worktree created successfully at: ${worktreePath} on branch: ${sessionBranch}`)
  }

  async removeWorktree(worktreePath: string): Promise<void> {
    debug(`Removing worktree at: ${worktreePath}`)
    try {
      await this.git.raw(['worktree', 'remove', worktreePath])
      debug(`Worktree removed successfully: ${worktreePath}`)
    } catch (error) {
      const errorMessage = getSanitizedErrorMessage(error)
      debug(`Error removing worktree: ${errorMessage}`)
      try {
        await this.git.raw(['worktree', 'remove', '--force', worktreePath])
        debug(`Worktree force removed: ${worktreePath}`)
      } catch (err) {
        const errMessage = getSanitizedErrorMessage(err)
        debug(`Failed to force remove worktree: ${errMessage}`)
        if (await pathExists(worktreePath)) {
          rmSync(worktreePath, { recursive: true, force: true })
          debug(`Manually removed worktree directory: ${worktreePath}`)
        }
      }
    }
  }

  async getCommitSha(): Promise<string> {
    return this.git.revparse('HEAD')
  }

  async pushWithRetry(): Promise<void> {
    try {
      const retries = env.GIT_PUSH_RETRIES
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          // Do advanced pull every third attempt
          if (attempt % 3 === 0) {
            await this.pull(true, true)
          } else {
            await this.git.pull(this.remote, this.branch, { '--rebase': 'true', '--depth': '5' })
          }
          await this.push()
          break
        } catch (error) {
          if (attempt === retries) throw error
          debug(`Attempt ${attempt} of ${retries} failed. Retrying...`)
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      }
    } catch (e) {
      const sanitizedMessage = getSanitizedErrorMessage(e)
      const sanitizedCommands = sanitizeGitPassword(JSON.stringify(e.task?.commands))
      debug(`${sanitizedMessage} for command ${sanitizedCommands}`)
      debug('Git save error')
      throw new GitPullError()
    }
  }

  async save(editor: string): Promise<void> {
    // we are in a unique developer branch, so we can pull, push, and merge
    // with the remote root, which might have been modified by another developer
    await this.commit(editor)
    await this.pushWithRetry()
  }
}

export async function getWorktreeRepo(
  mainRepo: Git,
  worktreePath: string,
  branch: string = mainRepo.branch,
): Promise<Git> {
  debug(`Creating worktree repo at: ${worktreePath}`)

  await mainRepo.createWorktree(worktreePath, branch)

  const worktreeRepo = new Git(worktreePath, mainRepo.url, mainRepo.user, mainRepo.email, mainRepo.urlAuth, branch)

  await worktreeRepo.addConfig()

  return worktreeRepo
}

export default async function getRepo(
  path: string,
  gitConfig: GitConfig,
  method: 'clone' | 'init' = 'clone',
): Promise<Git> {
  await ensureDir(path, { mode: 0o744 })
  const { repoUrl, branch, username, email } = gitConfig
  const urlNormalized = getUrl(repoUrl)
  const urlAuth = getAuthenticatedUrl(gitConfig)
  const repo = new Git(path, urlNormalized, username ?? 'otomi-admin', email, urlAuth, branch)
  await repo[method]()
  return repo
}
