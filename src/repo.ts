import simpleGit, { CleanOptions, CommitResult, SimpleGit, SimpleGitOptions } from 'simple-git'
import yaml from 'js-yaml'
import fs from 'fs'
import path from 'path'
import axios, { AxiosResponse } from 'axios'
import { GitPullError } from './error'
import { cleanEnv, TOOLS_HOST, USE_SOPS } from './validators'

const env = cleanEnv({
  TOOLS_HOST,
  USE_SOPS,
})

const baseUrl = `http://${env.TOOLS_HOST}:17771/`
const decryptUrl = `${baseUrl}decrypt`
const encryptUrl = `${baseUrl}encrypt`

export async function decrypt(): Promise<AxiosResponse | void> {
  if (!env.USE_SOPS) return Promise.resolve()
  console.info('Requesting decrypt action')
  const res = await axios.get(decryptUrl)
  return res
}

export async function encrypt(): Promise<AxiosResponse | void> {
  if (!env.USE_SOPS) return Promise.resolve()
  console.info('Requesting encrypt action')
  const res = await axios.get(encryptUrl)
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
    console.debug(`Writing to file: ${absolutePath}`)
    const yamlStr = yaml.safeDump(data, { indent: 4 })
    fs.writeFileSync(absolutePath, yamlStr, 'utf8')
  }

  fileExists(relativePath: string): boolean {
    const absolutePath = path.join(this.path, relativePath)
    return fs.existsSync(absolutePath)
  }

  readFile(relativePath): any {
    const absolutePath = path.join(this.path, relativePath)
    console.info(`Reading from file: ${absolutePath}`)
    const doc = yaml.safeLoad(fs.readFileSync(absolutePath, 'utf8'))
    return doc as any
  }

  async commit(author: string): Promise<CommitResult> {
    await this.git.add('./*')
    const commitSummary = await this.git.commit(`otomi-api<${author}>`)
    console.debug(`Commit summary: ${JSON.stringify(commitSummary)}`)
    return commitSummary
  }

  async clone(): Promise<void> {
    console.info(`Checking if repo exists at: ${this.path}`)

    const isRepo = await this.git.checkIsRepo()
    if (!isRepo) {
      console.info(`Repo does not exist. Cloning from: ${this.url} to: ${this.path}`)
      await this.git.clone(this.repoPathAuth, this.path)
      return
    }
    console.log('Repo already exists. Checking out correct branch.')
    await this.git.checkout(this.branch)

    if (env.isDev) await decrypt() // do it now because pull usually fails because of dirty state of git
    try {
      await this.pull()
      if (!env.isDev) await decrypt()
    } catch (e) {
      console.error(e)
      if (env.isDev) await this.git.clean(CleanOptions.FORCE)
      else throw e
    }
  }

  async pull(): Promise<any> {
    const pullSummary = await this.git.pull(this.remote, this.branch, { '--rebase': 'true' })
    console.debug(`Pull summary: ${JSON.stringify(pullSummary)}`)
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
      console.info(`Reset HEAD to ${sha} commit`)

      throw new GitPullError()
    }
    console.debug('pushing')
    await this.git.push(this.remote, this.branch)
    console.debug('pushed')
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
  if (!fs.existsSync(localPath)) fs.mkdirSync(localPath, 0o744)
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
  if (!fs.existsSync(localPath)) fs.mkdirSync(localPath, 0o744)
  const remotePathAuth = getRemotePathAuth(remotePath, protocol, user, password)

  const repo = new Repo(localPath, remotePath, user, email, remotePathAuth, branch)
  await repo.init()
  await repo.addConfig()
  return repo
}

export async function initRepoBare(location): Promise<SimpleGit> {
  fs.mkdirSync(location, 0o744)
  const options: Partial<SimpleGitOptions> = {
    baseDir: location,
    config: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ? ['http.sslVerify=false'] : undefined,
  }
  const git = simpleGit(options)
  await git.init(true)
  return git
}
