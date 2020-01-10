const path = require('path')
const util = require('util');
const dataProvider = require('./data-provider')
const shell = require('shelljs');

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
  constructor(dirPath, cloud) {
    this.dirPath = dirPath;
    this.aliasesRelativePath = './bin/aliases';
    this.teamsPath = path.join(dirPath, './values/teams.yaml');
    this.dataProvider = new dataProvider.DataProvider()
    this.shell = shell;
    this.cloud = cloud
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

  deploy() {
    const command = util.format('cd %s && source ./bin/aliases && hfd apply', + this.dirPath)
    this.cmd(command)
  }

  cmd(command) {
    console.info(command)
    this.shell.ls('*.js')

  }
}

module.exports = {
  AlreadyExists: AlreadyExists,
  NotExistError: NotExistError,
  OtomiStack: OtomiStack,
};