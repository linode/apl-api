import axios, { AxiosResponse } from 'axios'
import Debug from 'debug'
import diff from 'deep-diff'
import { rmSync } from 'fs'
import { copy, ensureDir, pathExists, readFile, writeFile } from 'fs-extra'
import { unlink } from 'fs/promises'
import { glob } from 'glob'
import { merge } from 'lodash'
import { basename, dirname, join } from 'path'
import simpleGit, { CheckRepoActions, CleanOptions, CommitResult, ResetMode, SimpleGit } from 'simple-git'
import {
  cleanEnv,
  GIT_BRANCH,
  GIT_LOCAL_PATH,
  GIT_PASSWORD,
  GIT_PUSH_RETRIES,
  GIT_REPO_URL,
  GIT_USER,
  TOOLS_HOST,
} from 'src/validators'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { BASEURL } from './constants'
import { GitPullError } from './error'
import { Core } from './otomi-models'
import { getSanitizedErrorMessage, removeBlankAttributes, sanitizeGitPassword } from './utils'

const debug = Debug('otomi:repo')

const env = cleanEnv({
  GIT_BRANCH,
  GIT_LOCAL_PATH,
  GIT_PASSWORD,
  GIT_REPO_URL,
  GIT_USER,
  GIT_PUSH_RETRIES,
  TOOLS_HOST,
})

const baseUrl = BASEURL
const valuesUrl = `${baseUrl}/otomi/values`

const getProtocol = (url): string => (url && url.includes('://') ? url.split('://')[0] : 'http')

const getUrl = (url): string => (!url || url.includes('://') ? url : `${getProtocol(url)}://${url}`)

function getUrlAuth(url, user, password): string | undefined {
  if (!url) return
  const protocol = getProtocol(url)
  const [_, bareUrl] = url.split('://')
  const encodedUser = encodeURIComponent(user as string)
  const encodedPassword = encodeURIComponent(password as string)
  return protocol === 'file' ? `${protocol}://${bareUrl}` : `${protocol}://${encodedUser}:${encodedPassword}@${bareUrl}`
}

export class Git {
  branch: string
  commitSha: string
  corrupt = false
  email: string
  git: SimpleGit
  password: string
  path: string
  remote: string
  remoteBranch: string
  url: string | undefined
  urlAuth: string | undefined
  user: string

  constructor(
    path: string,
    url: string | undefined,
    user: string,
    email: string,
    urlAuth: string | undefined,
    branch: string | undefined,
  ) {
    this.branch = branch || 'main'
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

  getProtocol() {
    return getProtocol(this.url)
  }

  async requestValues(params): Promise<AxiosResponse> {
    debug(`Tools: requesting "otomi/values" ${this.path}`)
    const res = await axios.get(valuesUrl, { params: { envDir: this.path, ...params } })
    return res
  }

  async addConfig(): Promise<void> {
    debug(`Adding git config`)
    await this.git.addConfig('user.name', this.user)
    await this.git.addConfig('user.email', this.email)
    if (this.isRootClone()) {
      if (this.getProtocol() === 'file') {
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
    return !!env.GIT_REPO_URL
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
    // remote root url
    this.url = getUrl(`${env.GIT_REPO_URL}`)
    if (!isRepo) {
      debug(`Initializing repo...`)
      if (!this.hasRemote() && this.isRootClone()) {
        return await this.initFromTestFolder()
      } else if (!this.isRootClone()) {
        // child clone, point to remote root
        this.urlAuth = getUrlAuth(this.url, env.GIT_USER, env.GIT_PASSWORD)
      }
      debug(`Cloning from '${this.url}' to '${this.path}'`)
      await this.git.clone(this.urlAuth!, this.path)
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

  async save(editor: string): Promise<void> {
    await this.commit(editor)
    try {
      // we are in a unique developer branch, so we can pull, push, and merge
      // with the remote root, which might have been modified by another developer
      // since this is a child branch, we don't need to re-init
      // retry up to 10 times to pull and push if there are conflicts
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
  url: string,
  user: string,
  email: string,
  password: string,
  branch: string,
  method: 'clone' | 'init' = 'clone',
): Promise<Git> {
  await ensureDir(path, { mode: 0o744 })
  const urlNormalized = getUrl(url)
  const urlAuth = getUrlAuth(urlNormalized, user, password)
  const repo = new Git(path, urlNormalized, user, email, urlAuth, branch)
  await repo[method]()
  return repo
}
