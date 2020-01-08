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
    const teams = this.getTeams()
    const team = teams.find(element => element.name == teamId)

    if (team === undefined)
      throw new NotExistError('Team does not exists');
    return team
  }

  addTeam(data) {
    if (this.getTeam(data.teamId) !== null)
      throw new AlreadyExists('Team already exists');

    let data = readYaml(this.teamsPath)
    data.teams.append(data)
    saveYaml(this.teamsPath, data)
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
  AlreadyExists: NotExistError,
  NotExistError: NotExistError,
  OtomiStack: OtomiStack,
};