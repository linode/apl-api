import simpleGit, { SimpleGit } from 'simple-git/promise'
import yaml from 'js-yaml'
import fs from 'fs'
import path from 'path'
import { GitPullError } from './error'
import axios from 'axios'
import { exec as Exec } from 'child_process'
import { promisify } from 'util'

const exec = promisify(Exec)
const env = process.env
const baseUrl = `http://${env.TOOLS_HOST || 'localhost'}:17771/`
const decryptUrl = `${baseUrl}dec`
const encryptUrl = `${baseUrl}enc`

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

  async addConfig() {
    await this.git.addConfig('user.name', this.user)
    await this.git.addConfig('user.email', this.email)
  }

  async init() {
    await this.git.init()
    await this.addRemoteOrigin()
  }

  writeFile(relativePath, data) {
    const absolutePath = path.join(this.path, relativePath) + '.dec'
    console.debug(`Writing to file: ${absolutePath}`)
    const yamlStr = yaml.safeDump(data)
    fs.writeFileSync(absolutePath, yamlStr, 'utf8')
  }

  readFile(relativePath) {
    const absolutePath = path.join(this.path, relativePath) + '.dec'
    console.info(`Reading from file: ${absolutePath}`)
    const doc = yaml.safeLoad(fs.readFileSync(absolutePath, 'utf8'))
    return doc
  }

  async commit() {
    await this.git.add('./*')
    await this.encrypt()
    const commitSummary = await this.git.commit('otomi-stack-api')
    console.debug(`Commit summary: ${JSON.stringify(commitSummary)}`)
    return commitSummary
  }

  static getNoteCmd(obj: any) {
    const note = JSON.stringify(obj)
    return ['notes', 'add', '-m', note]
  }

  async addNote(obj: any) {
    const cmd = Repo.getNoteCmd(obj)
    await this.git.raw(cmd)
  }

  async clone() {
    console.info(`Cloning from: ${this.url} to: ${this.path}`)
    await this.git.clone(this.repoPathAuth, this.path)

    await this.git.checkout(this.branch)
    await this.decrypt()
    return
  }

  async decrypt() {
    // if (env.TESTING) return
    const res = await axios.get(decryptUrl)
    return res
  }

  async encrypt() {
    // if (env.TESTING) return
    const res = await axios.get(encryptUrl)
    return res
  }

  async pull() {
    const pullSummary = await this.git.pull(this.remote, this.branch, { '--rebase': true })
    await this.decrypt()
    console.debug(`Pull summary: ${JSON.stringify(pullSummary)}`)
    return pullSummary
  }

  async getCommitSha() {
    return this.git.revparse(['--verify', 'HEAD'])
  }

  async save(team, email) {
    const sha = await this.getCommitSha()

    const commitSummary = await this.commit()
    if (commitSummary.commit === '') return
    await this.addNote({ team, email })
    try {
      await this.pull()
    } catch (e) {
      console.warn(`Pull error: ${JSON.stringify(e)}`)
      await this.git.rebase({ '--abort': true })
      await this.git.reset(['--hard', sha])
      console.info(`Reset HEAD to ${sha} commit`)

      throw new GitPullError()
    }

    await this.git.push(this.remote, this.branch)
  }

  async addRemoteOrigin() {
    await this.git.addRemote(this.remote, this.url)
  }
}

function getRemotePathAuth(path, protocol, user, password) {
  return protocol === 'file' ? `${protocol}://${path}` : `${protocol}://${user}:${password}@${path}`
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

export async function initRepoBare(path): Promise<SimpleGit> {
  fs.mkdirSync(path, 0o744)
  const git = simpleGit(path)
  await git.init(true)
  return git
}
