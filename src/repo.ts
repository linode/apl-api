import { Bool } from 'aws-sdk/clients/clouddirectory'
import axios, { AxiosResponse } from 'axios'
import Debug from 'debug'
import diff from 'deep-diff'
import { copy, ensureDir, pathExists, readFile, writeFile } from 'fs-extra'
import { unlink } from 'fs/promises'
import stringifyJson from 'json-stable-stringify'
import { cloneDeep, get, isEmpty, merge, set, unset } from 'lodash'
import path, { dirname } from 'path'
import simpleGit, { CheckRepoActions, CommitResult, SimpleGit, SimpleGitOptions } from 'simple-git'
import { cleanEnv, GIT_BRANCH, GIT_LOCAL_PATH, GIT_REPO_URL, TOOLS_HOST } from 'src/validators'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { GitPullError, HttpError, ValidationError } from './error'
import { Core } from './otomi-models'
import { removeBlankAttributes } from './utils'

const debug = Debug('otomi:repo')

const env = cleanEnv({
  GIT_BRANCH,
  GIT_LOCAL_PATH,
  GIT_REPO_URL,
  TOOLS_HOST,
})

const baseUrl = `http://${env.TOOLS_HOST}:17771/`
const prepareUrl = `${baseUrl}prepare`
const initUrl = `${baseUrl}init`

const getProtocol = (url): string => (url && url.includes('://') ? url.split('://')[0] : 'https')

const getUrl = (url): string => (!url || url.includes('://') ? url : `${getProtocol(url)}://${url}`)

function getUrlAuth(url, user, password): string | undefined {
  if (!url) return
  const protocol = getProtocol(url)
  const [_, bareUrl] = url.split('://')
  return protocol === 'file' ? `${protocol}://${bareUrl}` : `${protocol}://${user}:${password}@${bareUrl}`
}

const secretFileRegex = new RegExp(`^(.*/)?secrets.*.yaml(.dec)?$`)
export class Repo {
  branch: string
  deployedSha: string
  email: string
  git: SimpleGit
  password: string
  path: string
  remote: string
  remoteBranch: string
  secretFilePostfix = ''
  url: string
  urlAuth: string
  user: string

  constructor(localRepoPath, url, user, email, urlAuth, branch) {
    this.branch = branch
    this.email = email
    this.path = localRepoPath
    this.remote = 'origin'
    this.remoteBranch = `${this.remote}/${branch}`
    this.urlAuth = urlAuth
    this.user = user
    this.url = url
    this.git = simpleGit(this.path)
  }

  getProtocol() {
    return getProtocol(this.url)
  }

  async requestInitValues(): Promise<AxiosResponse | void> {
    debug(`Tools: requesting "init" on values repo path ${this.path}`)
    const res = await axios.get(initUrl, { params: { envDir: this.path } })
    return res
  }

  async requestPrepareValues(): Promise<AxiosResponse | void> {
    debug(`Tools: requesting "prepare" on values repo path ${this.path}`)
    const res = await axios.get(prepareUrl, { params: { envDir: this.path } })
    return res
  }

  async addConfig(): Promise<void> {
    debug(`Adding git config`)
    await this.git.addConfig('user.name', this.user)
    await this.git.addConfig('user.email', this.email)
    if (this.isRootClone()) {
      if (this.getProtocol() === 'file') {
        // tell the the git repo there to accept updates even when it is checked out
        const _git = simpleGit(this.url.replace('file://', ''))
        await _git.addConfig('receive.denyCurrentBranch', 'updateInstead')
      }
      // same for the root repo, which needs to accept pushes from children
      await this.git.addConfig('receive.denyCurrentBranch', 'updateInstead')
    }
  }

  async init(bare = true): Promise<void> {
    await this.git.init(bare !== undefined ? bare : this.isRootClone())
    await this.git.addRemote(this.remote, this.url)
  }

  async initSops(): Promise<void> {
    this.secretFilePostfix = (await pathExists(`${this.path}/.sops.yaml`)) ? '.dec' : ''
  }

  getSafePath(file) {
    if (this.secretFilePostfix === '') return file
    // otherwise we might have to give *.dec variant for secrets
    if (file.match(secretFileRegex) && !file.endsWith(this.secretFilePostfix)) return `${file}${this.secretFilePostfix}`
    return file
  }

  async removeFile(file): Promise<void> {
    const absolutePath = path.join(this.path, file)
    const exists = await this.fileExists(file)
    if (exists) {
      debug(`Removing file: ${absolutePath}`)
      // Remove empty secret file due to https://github.com/mozilla/sops/issues/926 issue
      await unlink(absolutePath)
    }
    if (file.match(secretFileRegex)) {
      // also remove the encrypted file as they are operated on in pairs
      const encFile = `${file}${this.secretFilePostfix}`
      if (await this.fileExists(encFile)) {
        const absolutePathEnc = path.join(this.path, encFile)
        debug(`Removing enc file: ${absolutePathEnc}`)
        await unlink(absolutePathEnc)
      }
    }
  }

  async diffFile(file, data): Promise<boolean> {
    const repoFile = this.getSafePath(file)
    const oldData = await this.readFile(repoFile)
    const deepDiff = diff(data, oldData)
    debug(`Diff for ${file}: `, deepDiff)
    return deepDiff
  }

  async writeFile(file, data): Promise<void> {
    const cleanedData = removeBlankAttributes(data)
    if (isEmpty(cleanedData)) {
      // handle empty data first
      await this.removeFile(file)
      // bail if we came to write secrets which we can't fill empty
      if (file.match(secretFileRegex)) return
    }
    // we also bail when no changes found
    const hasDiff = await this.diffFile(file, cleanedData)
    if (!hasDiff) return
    // ok, write new content
    const absolutePath = path.join(this.path, file)
    debug(`Writing to file: ${absolutePath}`)
    const sortedData = JSON.parse(stringifyJson(cleanedData) as string)
    const content = isEmpty(sortedData) ? '' : stringifyYaml(sortedData, undefined, 4)
    const dir = dirname(absolutePath)
    await ensureDir(dir)
    await writeFile(absolutePath, content, 'utf8')
  }

  async fileExists(relativePath: string): Promise<Bool> {
    const absolutePath = path.join(this.path, relativePath)
    return await pathExists(absolutePath)
  }

  async readFile(file, checkSuffix = false): Promise<any> {
    if (!(await this.fileExists(file))) return {}
    const safeFile = checkSuffix ? this.getSafePath(file) : file
    const absolutePath = path.join(this.path, safeFile)
    debug(`Reading from file: ${absolutePath}`)
    const doc = parseYaml(await readFile(absolutePath, 'utf8'))
    return doc
  }

  async loadConfig(file: string, secretFile: string): Promise<any> {
    const data = await this.readFile(file)
    const secretData = await this.readFile(secretFile, true)
    return merge(data, secretData) as Core
  }

  async saveConfig(
    dataPath: string,
    inSecretDataPath: string,
    config: any,
    secretPaths: string[],
  ): Promise<Promise<void>> {
    const secretData = {}
    const secretDataPath = `${inSecretDataPath}${this.secretFilePostfix}`
    const plainData = cloneDeep(config)
    secretPaths.forEach((objectPath) => {
      const val = get(config, objectPath)
      if (val) {
        set(secretData, objectPath, val)
        unset(plainData, objectPath)
      }
    })

    await this.writeFile(secretDataPath, secretData)
    await this.writeFile(dataPath, plainData)
  }

  isRootClone() {
    return this.path === env.GIT_LOCAL_PATH
  }

  hasRemote() {
    return env.GIT_REPO_URL
  }

  async initFromTestFolder(): Promise<void> {
    // we inflate GIT_LOCAL_PATH from the ./test folder
    debug(`DEV mode: using local folder values`)
    await copy(`${process.cwd()}/test/`, env.GIT_LOCAL_PATH, {
      recursive: true,
      overwrite: false,
    })
    await this.init(false)
    await this.git.checkoutLocalBranch(this.branch)
    await this.git.add('.')
    await this.addConfig()
    const summary = await this.git.commit('initial commit', undefined, this.getOptions())
    this.deployedSha = summary.commit
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
      await this.git.clone(this.urlAuth, this.path)
      await this.addConfig()
      await this.git.checkout(this.branch)
      this.deployedSha = await this.getCommitSha()
    } else if (this.url) {
      debug('Repo already exists. Checking out correct branch.')
      // Git fetch ensures that local git repository is synced with remote repository
      await this.git.fetch({})
      await this.git.checkout(this.branch)
    }
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

  async pull(skipRequest = false): Promise<any> {
    // test root can't pull as it has no remote
    if (!this.url) return
    debug('Pulling')
    const summary = await this.git.pull(this.remote, this.branch, { '--rebase': 'true' })
    const summJson = JSON.stringify(summary)
    debug(`Pull summary: ${summJson}`)
    await this.initSops()
    if (!skipRequest) await this.requestInitValues()
  }

  async push(): Promise<any> {
    if (!this.url && this.isRootClone()) return
    debug('Pushing')
    const summary = await this.git.push(this.remote, this.branch)
    debug('Pushed. Summary: ', summary)
    return
  }

  async getCommitSha(): Promise<string> {
    return this.git.revparse('HEAD')
  }

  async save(editor): Promise<void> {
    // prepare values first
    try {
      await this.requestPrepareValues()
    } catch (e) {
      debug(`ERROR: ${JSON.stringify(e)}`)
      if (e.response) {
        const { status } = e.response
        if (status === 422) throw new ValidationError()
        throw HttpError.fromCode(status)
      }
      throw new HttpError(500, e)
    }
    // all good? commit
    const sha = await this.getCommitSha()
    await this.commit(editor)
    try {
      // we are in a developer branch so first merge in root which might be changed by another dev
      // but since we are a child we don't need to re-init, just wait for root db to be copied
      const skipInit = true
      await this.pull(skipInit)
      await this.push()
    } catch (e) {
      debug(`${e.message.trim()} for command ${JSON.stringify(e.task?.commands)}`)
      debug(`Merge error: ${JSON.stringify(e)}`)
      await this.git.rebase(['--abort'])
      await this.git.reset(['--hard', sha])
      debug(`Reset HEAD to ${sha} commit`)
      throw new GitPullError()
    }
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

export async function initRepoBare(path: string): Promise<SimpleGit> {
  await ensureDir(path, { mode: 0o744 })
  const options: Partial<SimpleGitOptions> = {
    baseDir: path,
    config: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ? ['http.sslVerify=false'] : undefined,
  }
  const git = simpleGit(options)
  await git.init(true)
  return git
}
