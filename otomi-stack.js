yaml = require('js-yaml');
fs = require('fs');
path = require('path')


class NotExistError extends Error {
  constructor(message) {
    super(message);
  }
}

class AlreadyExists extends Error {
  constructor(message) {
    super(message);
  }
}

function readYaml(filePath) {
  console.debug("Reading file: " + filePath)
  let doc = yaml.safeLoad(fs.readFileSync(filePath, 'utf8'));
  return doc;
}



function saveYaml(filePath, data) {
  console.debug("Saving file: " + filePath)
  let yamlStr = yaml.safeDump(data);
  fs.writeFileSync(filePath, yamlStr, 'utf8');
}

class OtomiStack {
  constructor(dirPath) {
    this.dirPath = dirPath;
    this.valuesDirPath = path.join(dirPath, 'values');
    this.teamsPath = path.join(this.valuesDirPath, 'teams.yaml');
  }

  getTeams() {
    const data = readYaml(this.teamsPath)
    return data.teams
  }

  getTeamIndex(data, teamId){
    const index = data.teams.findIndex(el => el.name === teamId)
    if (index === -1)
      throw new NotExistError('Team does not exists');
    return index
  }
  getTeam(teamId) {
    const data = readYaml(this.teamsPath)
    const index = this.getTeamIndex(data, teamId)
    const team = data.teams[index]
    return team
  }

  createTeam(teamData) {
    let data = readYaml(this.teamsPath)
    const teamId = teamData.name
    if (data.teams.find(element => element.name == teamId) !== undefined)
      throw new AlreadyExists('Team already exists');

    data.teams.push(teamData)
    saveYaml(this.teamsPath, data)
    return teamData
  }

  editTeam(teamId, teamData) {
    let data = readYaml(this.teamsPath)
    const index = this.getTeamIndex(data, teamId)
    data.teams[index] = teamData
    saveYaml(this.teamsPath, data)
    return teamData
  }

  deleteTeam(teamId) {
    let data = readYaml(this.teamsPath)
    const index = this.getTeamIndex(data, teamId)
    data.teams.splice(index, 1)
    saveYaml(this.teamsPath, data)
  }
}

module.exports = {
  AlreadyExists: AlreadyExists,
  NotExistError: NotExistError,
  OtomiStack: OtomiStack,
};