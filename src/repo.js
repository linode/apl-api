const simpleGit = require('simple-git/promise');
const yaml = require('js-yaml');
const fs = require('fs');
const error = require('./error')
const path = require('path');


class Repo {
  constructor(localRepoPath, url, user, email, password) {
    this.path = localRepoPath
    this.git = simpleGit(this.path)
    this.url = url
    this.user = user
    this.email = email
    this.password = password
  }

  writeFile(relativePath, data) {
    const absolutePath = path.join(this.path, relativePath)
    console.debug("Writing to file: " + absolutePath)
    const yamlStr = yaml.safeDump(data);
    fs.writeFileSync(absolutePath, yamlStr, 'utf8');
  }

  readFile(relativePath) {
    const absolutePath = path.join(this.path, relativePath)
    console.debug("Reading from file: " + absolutePath)
    const doc = yaml.safeLoad(fs.readFileSync(absolutePath, 'utf8'));
    return doc
  }

  async commit(user, group) {
    console.debug("Committing changes")

    this.git.add('./*').then(this.git.commit('otomi-stack-api'))
    // const tag = user + "/" + group
    // // tagMessage - in JSON format can be used by parsers
    // const tagMessage = JSON.stringify({user: user, group: group, source: 'otomi-stack-api'})
    // await this.git.addAnnotatedTag(tag, tagMessage)
  }

  async push() {
    console.debug("Pushing changes to remote origin")

    try {
      const summary = await this.git.push()
      console.log(JSON.stringify(summary))
    } catch (err) {
      console.error(err.message);
      throw new error.GitError("Failed to push values to git repo")
    }
  }

  async clone() {
    console.debug("Cloning repo: " + this.url + " to: " + this.path)

    const isRepo = await this.git.checkIsRepo()
    if (!isRepo){
      const remote = `https://${this.user}:${this.password}@${this.url}`;
      await this.git.clone(remote, this.path)
      await this.git.addConfig('user.name', this.user)
      return await this.git.addConfig('user.email', this.email)
    }

    return isRepo

  }
}

module.exports = function (localPath, url, user, email, password) {
  if (!fs.existsSync(localPath))
    fs.mkdirSync(localPath, 0o744);
  return new Repo(localPath, url, user, email, password)
}

