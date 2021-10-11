import simpleGit, { CleanOptions, CommitResult, SimpleGit, SimpleGitOptions } from 'simple-git'
import yaml from 'js-yaml'
import path, { dirname } from 'path'
import axios, { AxiosResponse } from 'axios'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { isEmpty } from 'lodash'
import Debug from 'debug'
import { GitPullError } from './error'
import { cleanEnv, DISABLE_SYNC, TOOLS_HOST, USE_SOPS } from './validators'
import { decryptedFilePostfix, removeBlankAttributes } from './utils'

const debug = Debug('otomi:repo')

const decryptedFilePostfixRegex = new RegExp(`${decryptedFilePostfix}$`)

const env = cleanEnv({
  DISABLE_SYNC,
  TOOLS_HOST,
  USE_SOPS,
})

const baseUrl = `http://${env.TOOLS_HOST}:17771/`
const decryptUrl = `${baseUrl}decrypt`
const processUrl = `${baseUrl}encrypt`

export async function decrypt(): Promise<AxiosResponse | void> {
  if (!env.USE_SOPS) return Promise.resolve()
  debug('Requesting decrypt action')
  const res = await axios.get(decryptUrl)
  return res
}

export async function processValues(): Promise<AxiosResponse | void> {
  debug('Requesting process action')
  const res = await axios.get(processUrl)
  return res
}

function getRemotePathAuth(remotPath, protocol, user, password): string {
  return protocol === 'file' ? `${protocol}://${remotPath}` : `${protocol}://${user}:${password}@${remotPath}`
}

export class Repo {
  path: string

  git: SimpleGit

  url: string

  user: string

  email: string

  password: string

  branch: string

  remote: string

  remoteBranch: string

  repoPathAuth: string

  constructor(localRepoPath, remotePath, user, email, repoPathAuth, branch) {
    this.path = localRepoPath
    this.url = remotePath
    this.repoPathAuth = repoPathAuth
    this.user = user
    this.email = email
    this.branch = branch
    this.remote = 'origin'
    this.remoteBranch = `${this.remote}/${branch}`
    this.git = simpleGit(this.path)
  }

  async addConfig(): Promise<void> {
    await this.git.addConfig('user.name', this.user)
    await this.git.addConfig('user.email', this.email)
  }

  async init(): Promise<void> {
    await this.git.init()
    await this.addRemoteOrigin()
  }

  writeFile(relativePath, data): void {
    const absolutePath = path.join(this.path, relativePath)
    const cleanedData = removeBlankAttributes(data)
    if (isEmpty(cleanedData) && existsSync(absolutePath) && absolutePath.includes('/secrets.')) {
      debug(`Removing file: ${absolutePath}`)
      // Remove empty secret file due to https://github.com/mozilla/sops/issues/926 issue
      unlinkSync(absolutePath)
      if (decryptedFilePostfix !== '') {
        const absolutePathEncFile = absolutePath.replace(decryptedFilePostfixRegex, '')
        // also remove the encrypted file as they are operated on in pairs
        if (existsSync(absolutePathEncFile)) unlinkSync(absolutePathEncFile)
      }
      return
    }
    debug(`Writing to file: ${absolutePath}`)
    const yamlStr = yaml.safeDump(cleanedData, { indent: 4 })
    const dir = dirname(absolutePath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(absolutePath, yamlStr, 'utf8')
  }

  fileExists(relativePath: string): boolean {
    const absolutePath = path.join(this.path, relativePath)
    return existsSync(absolutePath)
  }

  readFile(relativePath): any {
    const absolutePath = path.join(this.path, relativePath)
    debug(`Reading from file: ${absolutePath}`)
    const doc = yaml.safeLoad(readFileSync(absolutePath, 'utf8'))
    return doc as any
  }

  async commit(author: string): Promise<CommitResult> {
    await this.git.add('./*')
    const commitSummary = await this.git.commit(`otomi-api<${author}>`)
    debug(`Commit summary: ${JSON.stringify(commitSummary)}`)
    return commitSummary
  }

  async clone(): Promise<void> {
    debug(`Checking if local git repository exists at: ${this.path}`)

    const isRepo = await this.git.checkIsRepo()
    if (!isRepo) {
      debug(`Local git repository does not exist. Cloning from '${this.url}' to '${this.path}'`)
      await this.git.clone(this.repoPathAuth, this.path)
    } else if (!env.DISABLE_SYNC) {
      console.log('Repo already exists. Checking out correct branch.')
      // Git fetch ensures that local git repository is synced with remote repository
      await this.git.fetch()
      await this.git.checkout(this.branch)
    }
    if (env.isDev) await decrypt() // do it now because pull usually fails because of dirty state of git
    try {
      await this.pull()
      if (!env.isDev) await decrypt()
    } catch (e) {
      if (env.isDev) await this.git.clean(CleanOptions.FORCE)
      else throw e
    }
  }

  async pull(): Promise<any> {
    const pullSummary = await this.git.pull(this.remote, this.branch, { '--rebase': 'true' })
    debug(`Pull summary: ${JSON.stringify(pullSummary)}`)
    return pullSummary
  }

  async getCommitSha(): Promise<string> {
    return this.git.revparse(['--verify', 'HEAD'])
  }

  async save(email): Promise<void> {
    const sha = await this.getCommitSha()

    const commitSummary: CommitResult = await this.commit(email)
    if (commitSummary.commit === '') return
    try {
      await this.pull()
    } catch (e) {
      console.warn(`Pull error: ${JSON.stringify(e)}`)
      await this.git.rebase(['--abort'])
      await this.git.reset(['--hard', sha])
      await decrypt()
      debug(`Reset HEAD to ${sha} commit`)

      throw new GitPullError()
    }
    debug('pushing')
    await this.git.push(this.remote, this.branch)
    debug('pushed')
  }

  async addRemoteOrigin(): Promise<void> {
    await this.git.addRemote(this.remote, this.url)
  }
}

export default async function cloneRepo(
  localPath,
  remotePath,
  user,
  email,
  password,
  branch,
  protocol = 'https',
): Promise<Repo> {
  if (!existsSync(localPath)) mkdirSync(localPath, 0o744)
  const remotePathAuth = getRemotePathAuth(remotePath, protocol, user, password)
  const repo = new Repo(localPath, remotePath, user, email, remotePathAuth, branch)
  await repo.clone()
  await repo.addConfig()
  return repo
}

export async function initRepo(
  localPath,
  remotePath,
  user,
  email,
  password,
  branch,
  protocol = 'https',
): Promise<Repo> {
  if (!existsSync(localPath)) mkdirSync(localPath, 0o744)
  const remotePathAuth = getRemotePathAuth(remotePath, protocol, user, password)

  const repo = new Repo(localPath, remotePath, user, email, remotePathAuth, branch)
  await repo.init()
  await repo.addConfig()
  return repo
}

export async function initRepoBare(location): Promise<SimpleGit> {
  mkdirSync(location, 0o744)
  const options: Partial<SimpleGitOptions> = {
    baseDir: location,
    config: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ? ['http.sslVerify=false'] : undefined,
  }
  const git = simpleGit(options)
  await git.init(true)
  return git
}
