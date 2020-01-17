const simpleGit = require('simple-git')
const yaml = require('js-yaml');
const fs = require('fs');
const error = require('./error')


class Repo {
  constructor(localPath){   
    this.git = simpleGit(localPath)
    this.path = localPath
  }

  writeFile(relativePath, data){
    console.debug("Writing to file: " + relativePath)
    const yamlStr = yaml.safeDump(data);
    fs.writeFileSync(relativePath, yamlStr, 'utf8');
  }

  readFile(relativePath){
    console.debug("Reading from file: " + relativePath)
    const doc = yaml.safeLoad(fs.readFileSync(relativePath, 'utf8'));
    return doc;
  }

  push(user, group){
    try {
      console.debug("Pushing to remote origin")

      this.git.commit('otomi-stack-api')
      const tag = "User: " + user + "Group: " + group
      // tagMessage - in JSON format can be used by parsers
      const tagMessage = JSON.stringify({user: user, group: group, source: 'otomi-stack-api'})
      this.git.addAnnotatedTag(tag, tagMessage)
      const summary = this.git.push()
      console.log(JSON.stringify(summary))
      return summary
    } 
    catch (err) {
        console.error(err.message);
        throw new error.GitError("Failed to push values to git repo")
      }

    }

  clone(url, user, password) {
    console.debug("Cloning repo: " + url + " to: " + this.path)
    const remote = `https://${user}:${password}@${url}`;
    this.git.clone(remote)
  }
}

module.exports = function(localPath) {
  return new Repo(localPath)
}

