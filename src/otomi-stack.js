const path = require('path')
const util = require('util');
const dataProvider = require('./data-provider')
const shell = require('shelljs');
const db = require('./db')

class OtomiStack {
  constructor(otomiStackPath, kubeContext, deploymentStage) {
    this.otomiStackPath = otomiStackPath;
    this.aliasesRelativePath = './bin/aliases';
    this.teamsPath = path.join(otomiStackPath, './values/teams.yaml');
    this.dataProvider = new dataProvider.DataProvider()
    this.shell = shell;
    this.kubContext = kubeContext
    this.deploymentStage = deploymentStage
    this.db = db.init()
  }

  getTeams() {
    const res_data = this.db.getCollection('teams')
    return res_data
  }

  getTeam(req_params) {
    const res_data = this.db.getItem('teams', req_params)
    return res_data
  }

  createTeam(req_params, data) {
    // The team name is its ID
    req_params.teamId = data.name
    const res_data = this.db.createItem('teams', req_params, data )
    return res_data
  }

  editTeam(req_params, data) {
    const res_data = this.db.updateItem('teams', req_params, data)
    return res_data
  }

  deleteTeam(req_params) {
    const res_data = this.db.deleteItem('teams', req_params)
    return res_data
  }

  getServices(req_params) {
    const res_data = this.db.getCollection('services', req_params)
    return res_data
  }

  createService(req_params, data) {
    // The service name is its ID
    req_params.serviceId = data.name
    const res_data = this.db.createItem('services', req_params, data )
    return res_data
  }

  getService(req_params) {
    const res_data = this.db.getItem('services', req_params)
    return res_data
  }

  editService(req_params, data) {
    const res_data = this.db.updateItem('services', req_params, data)
    return res_data
  }

  deleteService(req_params) {
    const res_data = this.db.deleteItem('services', req_params)
    return res_data
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