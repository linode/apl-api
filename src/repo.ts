import simpleGit, { SimpleGit } from 'simple-git/promise'

import yaml from 'js-yaml'
import fs from 'fs'
import path from 'path'
import { GitPullError, GitPushError, GitError } from './error'

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

  urlLogin: string

  constructor(localRepoPath, url, user, email, password, branch) {
    this.path = localRepoPath
    this.url = url
    this.urlLogin = `https://${user}:${password}@${url}`
    this.git = simpleGit(this.path)
    this.user = user
    this.email = email
    this.password = password
    this.branch = branch
    this.remote = 'origin'
    this.remoteBranch = `${this.remote}/${branch}`
  }

  writeFile(relativePath, data) {
    const absolutePath = path.join(this.path, relativePath)
    console.debug(`Writing to file: ${absolutePath}`)
    const yamlStr = yaml.safeDump(data)
    fs.writeFileSync(absolutePath, yamlStr, 'utf8')
  }

  readFile(relativePath) {
    const absolutePath = path.join(this.path, relativePath)
    console.info(`Reading from file: ${absolutePath}`)
    const doc = yaml.safeLoad(fs.readFileSync(absolutePath, 'utf8'))
    return doc
  }

  async commit() {
    console.info('Committing changes')
    await this.git.add('./*')
    const commitSummary = await this.git.commit('otomi-stack-api')
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

  async push() {
    console.info(`Pushing values to remote ${this.remoteBranch}`)

    try {
      const res = await this.git.push(this.remote, this.branch)
      console.info(`Successfully pushed values to remote ${this.remoteBranch}`)
      return res
    } catch (err) {
      console.error(err.message)
      throw new GitPushError(`Failed to push values to remote ${this.remoteBranch}`)
    }
  }

  async clone() {
    console.info(`Checking if repo exists at: ${this.path}`)

    const isRepo = await this.git.checkIsRepo()
    if (!isRepo) {
      console.info(`Repo does not exist. Cloning from: ${this.url} to: ${this.path}`)
      await this.git.clone(this.urlLogin, this.path)
      await this.git.addConfig('user.name', this.user)
      await this.git.addConfig('user.email', this.email)
      await this.git.checkout(this.branch)
    }

    console.log('Repo already exists. Pulling latest changes')
    await this.pull()

    return isRepo
  }

  async pull() {
    let pullSummary
    try {
      pullSummary = await this.git.pull(this.remote, this.branch, { '--rebase': true })
      console.log(`Pull ${pullSummary.files.length} files`)
      return pullSummary
    } catch (e) {
      console.error(`Unable to rebase: ${JSON.stringify(e)}`)
    }
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
    const pullSummary = await this.pull()
    if (!pullSummary) {
      await this.git.rebase({ '--abort': true })
      this.git.reset(['--hard', sha])
      throw new GitPullError()
    }
    await this.push()
  }

  async addRemoteOrigin(origin: string) {
    await this.git.addRemote(this.remote, origin)
  }
}

export default function repo(localPath = '/tmp/otomi-stack', url, user, email, password, branch): Repo {
  if (!fs.existsSync(localPath)) fs.mkdirSync(localPath, 0o744)
  return new Repo(localPath, url, user, email, password, branch)
}

export async function createBareRepo(path = '/tmp/repo-bare'): Promise<SimpleGit> {
  // if (fs.existsSync(path)) throw new GitError(`Path exists: ${path}`)
  fs.mkdirSync(path, 0o744)
  const git = simpleGit(path)
  await git.init(true)
  return git
}
