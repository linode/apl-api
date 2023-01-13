import Debug from 'debug'
import { copy, ensureDir, pathExists } from 'fs-extra'
import { join } from 'path'
import simpleGit, { CheckRepoActions, CommitResult, SimpleGit } from 'simple-git'
import { cleanEnv, GIT_BRANCH, GIT_LOCAL_PATH, GIT_REPO_URL, TOOLS_HOST } from 'src/validators'
import { GitPullError } from './error'

const debug = Debug('otomi:repo')

const env = cleanEnv({
  GIT_BRANCH,
  GIT_LOCAL_PATH,
  GIT_REPO_URL,
  TOOLS_HOST,
})

const getProtocol = (url): string => (url && url.includes('://') ? url.split('://')[0] : 'https')

const getUrl = (url): string => (!url || url.includes('://') ? url : `${getProtocol(url)}://${url}`)

function getUrlAuth(url, user, password): string | undefined {
  if (!url) return
  const protocol = getProtocol(url)
  const [_, bareUrl] = url.split('://')
  return protocol === 'file' ? `${protocol}://${bareUrl}` : `${protocol}://${user}:${password}@${bareUrl}`
}

export class Repo {
  branch: string
  commitSha: string
  corrupt = false
  email: string
  git: SimpleGit
  password: string
  path: string
  remote: string
  remoteBranch: string
  secretFilePostfix = ''
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
    this.git = simpleGit(this.path)
  }

  getProtocol() {
    return getProtocol(this.url)
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

  isRootClone(): boolean {
    return this.path === env.GIT_LOCAL_PATH
  }

  hasRemote(): boolean {
    return !!env.GIT_REPO_URL
  }

  async fileExists(relativePath: string): Promise<boolean> {
    const absolutePath = join(this.path, relativePath)
    return await pathExists(absolutePath)
  }

  async initFromTestFolder(): Promise<void> {
    // we inflate GIT_LOCAL_PATH from the ./test folder
    debug(`DEV mode: using local folder values`)
    await copy(join(process.cwd(), 'test'), env.GIT_LOCAL_PATH, {
      recursive: true,
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
      if (!this.hasRemote() && this.isRootClone()) return await this.initFromTestFolder()
      else if (!this.isRootClone()) {
        // child clone, point to root
        this.url = `file://${env.GIT_LOCAL_PATH}`
        this.urlAuth = this.url
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

  async pull(): Promise<any> {
    // test root can't pull as it has no remote
    if (!this.url) return
    debug('Pulling')
    try {
      const summary = await this.git.pull(this.remote, this.branch, { '--rebase': 'true' })
      const summJson = JSON.stringify(summary)
      debug(`Pull summary: ${summJson}`)
      this.commitSha = await this.getCommitSha()
    } catch (e) {
      const err = 'Could not pull from remote. Upstream commits? Marked db as corrupt.'
      debug(err, e)
      this.corrupt = true
      throw new GitPullError(err)
    }
  }

  async push(): Promise<void> {
    if (!this.url && this.isRootClone()) return
    debug('Pushing')
    try {
      const summary = await this.git.push(this.remote, this.branch)
      debug('Pushed. Summary: ', summary)
    } catch (e) {
      debug(`${e.message.trim()} for command ${JSON.stringify(e.task?.commands)}`)
      debug(`Merge error: ${JSON.stringify(e)}`)
      throw new GitPullError()
    }
  }

  async getCommitSha(): Promise<string> {
    return this.git.revparse('HEAD')
  }
}

export default async function getRepo(
  path: string,
  url: string,
  user: string,
  email: string,
  password: string,
  branch: string,
  method: 'clone' | 'init' = 'clone',
): Promise<Repo> {
  await ensureDir(path, { mode: 0o744 })
  const urlNormalized = getUrl(url)
  const urlAuth = getUrlAuth(urlNormalized, user, password)
  const repo = new Repo(path, urlNormalized, user, email, urlAuth, branch)
  await repo[method]()
  return repo
}
