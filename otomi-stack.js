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

class OtomiStack {
  constructor(dirPath, dataProvider) {
    this.dirPath = dirPath;
    this.valuesDirPath = path.join(dirPath, 'values');
    this.teamsPath = path.join(this.valuesDirPath, 'teams.yaml');
    this.dataProvider = dataProvider
  }

  getTeams() {
    const data = this.dataProvider.readYaml(this.teamsPath)
    return data.teams
  }

  getTeamIndex(data, teamId) {
    const index = data.teams.findIndex(el => el.name === teamId)
    if (index === -1)
      throw new NotExistError('Team does not exists');
    return index
  }
  getTeam(teamId) {
    const data = this.dataProvider.readYaml(this.teamsPath)
    const index = this.getTeamIndex(data, teamId)
    const team = data.teams[index]
    return team
  }

  createTeam(teamData) {
    let data = this.dataProvider.readYaml(this.teamsPath)
    const teamId = teamData.name
    if (data.teams.find(element => element.name == teamId) !== undefined)
      throw new AlreadyExists('Team already exist');

    data.teams.push(teamData)
    this.dataProvider.saveYaml(this.teamsPath, data)
    return teamData
  }

  editTeam(teamId, teamData) {
    let data = this.dataProvider.readYaml(this.teamsPath)
    const index = this.getTeamIndex(data, teamId)
    data.teams[index] = teamData
    this.dataProvider.saveYaml(this.teamsPath, data)
    return teamData
  }

  deleteTeam(teamId) {
    let data = this.dataProvider.readYaml(this.teamsPath)
    const index = this.getTeamIndex(data, teamId)
    data.teams.splice(index, 1)
    this.dataProvider.saveYaml(this.teamsPath, data)
  }
}

module.exports = {
  AlreadyExists: AlreadyExists,
  NotExistError: NotExistError,
  OtomiStack: OtomiStack,
};