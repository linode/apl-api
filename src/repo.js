const simpleGit = require('simple-git/promise')
const yaml = require('js-yaml')
const fs = require('fs')
const error = require('./error')
const path = require('path')

class Repo {
  constructor(localRepoPath, url, user, email, password, branch) {
    this.path = localRepoPath
    this.git = simpleGit(this.path)
    this.url = url
    this.user = user
    this.email = email
    this.password = password
    this.branch = branch
  }

  writeFile(relativePath, data) {
    const absolutePath = path.join(this.path, relativePath)
    console.debug('Writing to file: ' + absolutePath)
    const yamlStr = yaml.safeDump(data)
    fs.writeFileSync(absolutePath, yamlStr, 'utf8')
  }

  readFile(relativePath) {
    const absolutePath = path.join(this.path, relativePath)
    console.info('Reading from file: ' + absolutePath)
    const doc = yaml.safeLoad(fs.readFileSync(absolutePath, 'utf8'))
    return doc
  }

  async commit(teamId, email) {
    console.info('Committing changes')
    await this.git.add('./*')
    const commitSummary = await this.git.commit('otomi-stack-api')
    if (commitSummary.commit === '') return commitSummary
    // Only add note to a new commit
    await this.addNote({ team: teamId, email })
    return commitSummary
  }

  getNoteCmd(obj) {
    const note = JSON.stringify(obj)
    return ['notes', 'add', '-m', note]
  }

  async addNote(obj) {
    const cmd = this.getNoteCmd(obj)
    return this.git.raw(cmd)
  }
  async push() {
    console.info('Pushing values to remote origin')

    try {
      const res = await this.git.push('origin', this.branch)
      console.info('Successfully pushed values to remote origin')
      return res
    } catch (err) {
      console.error(err.message)
      throw new error.GitError('Failed to push values to remote origin')
    }
  }

  async clone() {
    console.info('Checking if repo exists at: ' + this.path)

    const isRepo = await this.git.checkIsRepo()
    if (!isRepo) {
      console.info('Repo does not exist. Cloning from: ' + this.url + ' to: ' + this.path)
      const remote = `https://${this.user}:${this.password}@${this.url}`
      await this.git.clone(remote, this.path)
      await this.git.addConfig('user.name', this.user)
      await this.git.addConfig('user.email', this.email)
      // return await this.git.pull('origin', this.branch)
      return await this.git.checkout(this.branch)
    }

    console.log('Repo already exists. Pulling latest changes')
    // await this.git.checkout(this.branch)
    await this.git.pull('origin', this.branch)

    return isRepo
  }
}

function init(localPath = '/tmp/otomi-stack', url, user, email, password, branch) {
  if (!fs.existsSync(localPath)) fs.mkdirSync(localPath, 0o744)
  return new Repo(localPath, url, user, email, password, branch)
}

module.exports = {
  init: init,
  Repo: Repo,
}
