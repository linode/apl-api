import { Bool } from 'aws-sdk/clients/clouddirectory'
import axios, { AxiosResponse } from 'axios'
import Debug from 'debug'
import diff from 'deep-diff'
import { copy, ensureDir, pathExists } from 'fs-extra'
import { mkdir, readFile, unlink, writeFile } from 'fs/promises'
import stringifyJson from 'json-stable-stringify'
import { cloneDeep, get, isEmpty, merge, set, unset } from 'lodash'
import path, { dirname } from 'path'
import simpleGit, { CheckRepoActions, CommitResult, SimpleGit, SimpleGitOptions } from 'simple-git'
import { removeBlankAttributes } from 'src/utils'
import { cleanEnv, GIT_BRANCH, GIT_LOCAL_PATH, GIT_REPO_URL, TOOLS_HOST } from 'src/validators'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { GitPullError, HttpError, ValidationError } from './error'
import { Core } from './otomi-models'

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

async function initValues(envDir?: string): Promise<AxiosResponse | void> {
  debug('Requesting values repo "init" action')
  const res = await axios.get(initUrl, { params: { envDir } })
  return res
}

export async function prepareValues(envDir?: string): Promise<AxiosResponse | void> {
  debug('Requesting values repo "prepare" action')
  const res = await axios.get(prepareUrl, { params: { envDir } })
  return res
}

function getUrlAuth(url, protocol, user, password): string {
  if (['http', 'file'].includes(url.substring(0, 4))) return url
  return protocol === 'file' ? `${protocol}://${url}` : `${protocol}://${user}:${password}@${url}`
}

export class Repo {
  branch: string
  secretFilePostfix: string
  secretFileRegex: RegExp
  email: string
  git: SimpleGit
  password: string
  path: string
  remote: string
  remoteBranch: string
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
    if (this.hasRemote()) this.url = url
    else this.url = `file://${env.GIT_LOCAL_PATH}`
    this.git = simpleGit(this.path)
  }

  async addConfig(): Promise<void> {
    await this.git.addConfig('user.name', this.user)
    await this.git.addConfig('user.email', this.email)
    if (this.isRootClone() && !this.hasRemote()) await this.git.addConfig('receive.denyCurrentBranch', 'updateInstead')
  }

  async init(): Promise<void> {
    await this.git.init()
    await this.git.addRemote(this.remote, this.url)
  }

  async initSops(): Promise<void> {
    this.secretFilePostfix = (await pathExists(`${this.path}/.sops.yaml`)) ? '.dec' : ''
    this.secretFileRegex = new RegExp(`^(.*/)?secrets.*.yaml(.dec)?$`)
  }

  getSafePath(file) {
    if (this.secretFilePostfix === '') return file
    // otherwise we might have to give *.dec variant for secrets
    if (file.match(this.secretFileRegex) && !file.endsWith(this.secretFilePostfix))
      return `${file}${this.secretFilePostfix}`
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
    if (file.match(this.secretFileRegex)) {
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
      if (file.match(this.secretFileRegex)) return
    }
    // we also bail when no changes found
    const hasDiff = await this.diffFile(file, cleanedData)
    if (!hasDiff) return
    // ok, write new content
    const absolutePath = path.join(this.path, file)
    debug(`Writing to file: ${absolutePath}`)
    const sortedData = JSON.parse(stringifyJson(cleanedData))
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
    return !env.isDev || env.GIT_REPO_URL //.startsWith('http')
  }

  async clone(): Promise<void> {
    debug(`Checking if local git repository exists at: ${this.path}`)
    const isRepo = await this.git.checkIsRepo(CheckRepoActions.IS_REPO_ROOT)
    if (!isRepo) {
      debug(`No repo initialized, initializing`)
      if (!this.hasRemote()) {
        debug(`DEV mode: no remote url given`)
        // we inflate GIT_LOCAL_PATH from the file:// url if given, otherwise from ./test folder
        const isRootClone = this.isRootClone()
        if (isRootClone) {
          debug(`DEV mode: using local folder values`)
          // if (this.url.startsWith('file://')) await this.git.clone(this.urlAuth, this.path)
          await copy(
            env.GIT_REPO_URL ? env.GIT_REPO_URL.replace('file://', '') : `${process.cwd()}/test/`,
            env.GIT_LOCAL_PATH,
            { recursive: true, overwrite: false },
          )
          await this.init()
          await this.git.checkoutLocalBranch(this.branch)
          await this.git.add('.')
          await this.git.commit('initial commit', undefined, this.getOptions())
        } else {
          const remote = `file://${env.GIT_LOCAL_PATH}`
          debug(`Cloning from '${remote}' to '${this.path}'`)
          await this.git.clone(remote, this.path)
        }
      } else {
        debug(`Cloning from '${this.url}' to '${this.path}'`)
        await this.git.clone(this.urlAuth, this.path)
      }
    } else if (this.hasRemote()) {
      debug('Repo already exists. Checking out correct branch.')
      // Git fetch ensures that local git repository is synced with remote repository
      await this.git.fetch({})
      await this.git.checkout(this.branch)
    } else await this.pull()
    // do some post processing after getting latest state:
    await initValues(this.path)
    // re-init sops as it might have changed
    await this.initSops()
  }

  getOptions() {
    const options = {}
    if (env.isDev) options['--no-verify'] = null // only for dev do we have git hooks blocking direct commit
    return options
  }

  async commit(editor: string): Promise<CommitResult> {
    debug(`Committing`)
    await this.git.add('./*')
    const commitSummary = await this.git.commit(`otomi-api commit by ${editor}`, undefined, this.getOptions())
    debug(`Commit summary: ${JSON.stringify(commitSummary)}`)
    return commitSummary
  }

  async pull(): Promise<any> {
    if (!this.hasRemote() && this.isRootClone()) return
    debug('Pulling')
    const summary = await this.git.pull(this.remote, this.branch, { '--rebase': 'true' })
    debug(`Pull summary: ${JSON.stringify(summary)}`)
    return summary
  }

  async push(): Promise<any> {
    debug('Pushing')
    const summary = await this.git.push(this.remote, this.branch)
    debug('Pushed. Summary: ', summary)
    return
    // }
    // just overwrite the root folder
    // if (!this.isRootClone()) {
    //   await rm(env.GIT_LOCAL_PATH, { recursive: true, force: true })
    //   await copy(this.path, env.GIT_LOCAL_PATH, { recursive: true })
    // }
  }

  async getCommitSha(): Promise<string> {
    return this.git.revparse(['--verify', 'HEAD'])
  }

  async save(editor): Promise<void> {
    // prepare values first
    try {
      await prepareValues(this.path)
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
    const commitSummary: CommitResult = await this.commit(editor)
    // if (commitSummary.commit === '' || !hasRemote) return
    try {
      // we are in a developer branch so first merge in root which might be changed by another dev
      await this.pull()
      await this.push()
    } catch (e) {
      debug(`${e.message.trim()} for command ${JSON.stringify(e.task?.commands)}`)
      debug(`Merge error: ${JSON.stringify(e)}`)
      await this.git.rebase(['--abort'])
      await this.git.reset(['--hard', sha])
      await initValues(this.path)
      debug(`Reset HEAD to ${sha} commit`)
      throw new GitPullError()
    }
  }
}

export default async function cloneRepo(path, url, user, email, password, branch, protocol = 'https'): Promise<Repo> {
  await ensureDir(path, { mode: 0o744 })
  const urlAuth = getUrlAuth(url, protocol, user, password)
  const repo = new Repo(path, url, user, email, urlAuth, branch)
  await repo.clone()
  await repo.addConfig()
  return repo
}

export async function initRepo(path, url, user, email, password, branch, protocol = 'https'): Promise<Repo> {
  if (!(await pathExists(path))) await mkdir(path, 0o744)
  const urlAuth = getUrlAuth(url, protocol, user, password)
  const repo = new Repo(path, url, user, email, urlAuth, branch)
  await repo.init()
  await repo.addConfig()
  return repo
}

export async function initRepoBare(location): Promise<SimpleGit> {
  await mkdir(location, 0o744)
  const options: Partial<SimpleGitOptions> = {
    baseDir: location,
    config: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ? ['http.sslVerify=false'] : undefined,
  }
  const git = simpleGit(options)
  await git.init(true)
  return git
}
