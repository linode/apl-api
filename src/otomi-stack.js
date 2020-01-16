const path = require('path')
const util = require('util');
const dataProvider = require('./data-provider')
const shell = require('shelljs');
const db = require('./db')
const err = require('./error')

class OtomiStack {
  constructor(otomiStackPath, kubeContext, deploymentStage) {
    this.otomiStackPath = otomiStackPath;
    this.aliasesRelativePath = './bin/aliases';
    this.teamsPath = path.join(otomiStackPath, './values/teams.yaml');
    this.dataProvider = new dataProvider.DataProvider()
    this.shell = shell;
    this.kubContext = kubeContext
    this.deploymentStage = deploymentStage
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
    let team = data.teams[index]
    // Edit team edits only few fields from whole team structure
    data.teams[index] = {...team, ...teamData}
    this.dataProvider.saveYaml(this.teamsPath, data)
    return teamData
  }

  deleteTeam(teamId) {
    let data = this.dataProvider.readYaml(this.teamsPath)
    const index = this.getTeamIndex(data, teamId)
    data.teams.splice(index, 1)
    this.dataProvider.saveYaml(this.teamsPath, data)
  }

  getServices(teamId) {
    const data = this.dataProvider.readYaml(this.teamsPath)
    const index = this.getTeamIndex(data, teamId)
    const team = data.teams[index]
    return team.services
  }

  createService(teamId, service) {
    let data = this.dataProvider.readYaml(this.teamsPath)
    const index = this.getTeamIndex(data, teamId)
    const team = data.teams[index]

    const serviceId = service.name
    if (team.services.find(element => element.name == serviceId) !== undefined)
      throw new err.AlreadyExists('Service already exist');

    team.services.push(service)
    this.dataProvider.saveYaml(this.teamsPath, data)

  }

  getService(teamId, serviceId) {
    let data = this.dataProvider.readYaml(this.teamsPath)
    const index = this.getTeamIndex(data, teamId)
    const team = data.teams[index]
    const service = team.services.find(element => element.name == serviceId)
    if(!service)
      throw new err.NotExistError("Service does not exists")
    return service
  }

  editService(teamId, serviceId, serviceData) {
    let data = this.dataProvider.readYaml(this.teamsPath)
    let index = this.getTeamIndex(data, teamId)
    let team = data.teams[index]
    index = team.services.findIndex(element => element.name == serviceId)
    team.services[index] = serviceData
    this.dataProvider.saveYaml(this.teamsPath, data)
    return serviceData
  }
  
  deploy() {
    const command = util.format(
      'cd %s && kubectl config use-context %s && helmfile -e %s apply --concurrency=1 --skip-deps;', 
      this.otomiStackPath, this.kubeContext, this.deploymentStage)
    this.cmd(command)
  }

  cmd(command) {
    console.info(command)
    this.shell.ls('*.js')

  }
}

module.exports = {
  OtomiStack: OtomiStack,
};