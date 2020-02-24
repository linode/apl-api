var generatePassword = require('password-generator');
var _ = require('lodash');
var path = require('path')
class OtomiStack {
  constructor(repo, db) {
    this.db = db
    this.repo = repo
    this.valuesPath = './values/_env/teams.yaml'
    this.envPath = './values/_env/'
    this.coreValuesPath = './core.yaml'
  }

  async init() {
    try {
      await this.repo.clone()
      this.loadValues()
    } catch (e) {
      console.error(e.message)
      return false
    }
    return true
  }

  getValueFilePath(cloud, cluster) {
    const clusterFilename = cluster + '.yaml'
    return path.join(this.envPath, cloud, clusterFilename)
  }

  getTeams() {
    const res_data = this.db.getCollection('teams')
    return res_data
  }

  getClouds() {
    const res_data = this.db.getCollection('clouds')
    return res_data
  }

  getClusters() {
    const res_data = this.db.getItem('clusters', {})
    return res_data
  }

  getTeam(req_params) {
    const res_data = this.db.getItem('teams', req_params)
    return res_data
  }

  updateTeam(req_params, data) {
    this.db.updateItem('teams', req_params, data)
  }

  checkIfTeamExists(req_params) {
    this.db.getItem('teams', { teamId: req_params.teamId })
  }

  createTeam(req_params, data) {
    // The team name is its ID
    req_params.teamId = data.name
    const res_data = this.db.createItem('teams', req_params, data)
    return res_data
  }

  editTeam(req_params, data) {
    const res_data = this.db.updateItem('teams', req_params, data)
    return res_data
  }

  deleteTeam(req_params) {
    let res_data = this.db.deleteItem('services', req_params)
    res_data = this.db.deleteItem('teams', req_params)

    return res_data
  }

  getServices(req_params) {
    // console.log(req_params)
    this.checkIfTeamExists(req_params)
    const res_data = this.db.getCollection('services', req_params)
    return res_data
  }

  createService(req_params, data) {
    this.checkIfTeamExists(req_params)
    // The service name is its ID
    req_params.serviceId = data.name
    const res_data = this.db.createItem('services', req_params, data)
    return res_data
  }

  updateService(req_params, data) {
    this.db.updateItem('services', req_params, data)
  }

  createDefaultService(data) {
    const res_data = this.db.createItem('defaultServices', {}, data)
    return res_data
  }

  getDefaultServices() {
    return this.db.getCollection('defaultServices')
  }


  getService(req_params) {
    this.checkIfTeamExists(req_params)
    const res_data = this.db.getItem('services', req_params)
    return res_data
  }

  editService(req_params, data) {
    this.checkIfTeamExists(req_params)
    const res_data = this.db.updateItem('services', req_params, data)
    return res_data
  }

  deleteService(req_params) {
    this.checkIfTeamExists(req_params)
    const res_data = this.db.deleteItem('services', req_params)
    return res_data
  }

  getDeployments(req_params) { }

  async triggerDeployment(req_params, userGroup) {

    this.saveValues()
    await this.repo.commit(userGroup)
    return await this.repo.push()

  }

  loadValues() {
    const core_values = this.repo.readFile(this.coreValuesPath)
    this.convertCoreValuesToDb(core_values)

    const clusters = this.getClusters()
    this.loadAllTeamValues(clusters)
  }

  loadAllTeamValues(clusters) {
    _.forIn(clusters, (cloudName, cloudClusters) => {
      _.forEach(cloudClusters, (clusterName) => {
        const path = this.getValueFilePath(cloudName, clusterName)
        const values = this.repo.readFile(path)
        console.log(values.teamConfig.teams)
        this.convertTeamValuesTeamsToDb(values.teamConfig.teams, cloudName, clusterName)
      })
    })
  }

  convertCoreValuesToDb(values) {
    const cs = values.clouds
    const clusters = {
      'aws': [],
      'azure': [],
      'google': [],
    }

    Object.keys(clusters).forEach(cloudName => {
      console.log(cs[cloudName])
      if (!cs[cloudName])
        return

      clusters[cloudName] = Object.keys(cs[cloudName].clusters)
    })

    this.db.createItem('clusters', {}, clusters)
  }

  convertTeamValuesTeamsToDb(teams, cloudName, clusterName) {
    console.log(teams)
    _.forIn(teams, (teamData, teamId) => {
      console.log(`${teamId}:${teamData}`)
      this.convertTeamToDb(teamData, teamId, cloudName, clusterName)
    })
  }

  assignCluster(obj, cloud, cluster) {
    console.info(`Assigning cluster ${cloud}-${cluster} to team ${obj.name}`)
    const objectPath = `clusters.${cloud}`
    const clusters = _.get(obj, objectPath, [])
    clusters.push(cluster)
    _.set(obj, objectPath, clusters)
  }

  convertTeamToDb(teamData, teamId, cloud, cluster) {

    // console.log(`${teamId}: ${teamData}`);
    // console.debug(JSON.stringify(teamData))
    console.log(teamData)

    const id = { teamId: teamId }
    try {
      // Here we only update clusters
      let team = this.getTeam(id)
      this.assignCluster(team, cloud, cluster)
      this.updateTeam(id, team)
    } catch (err) {
      // Here we creat a team in DB
      let rawTeam = _.omit(teamData, 'services')
      this.assignCluster(rawTeam, cloud, cluster)
      this.createTeam(id, rawTeam)
    }

    console.log(teamData)
    this.convertTeamValuesServicesToDb(teamData.services, teamId, cloud, cluster)
  }

  convertTeamValuesServicesToDb(services, teamId, cloud, cluster) {
    services.forEach(svc => {
      this.convertServiceToDb(svc, teamId, cloud, cluster)
    })
  }

  convertServiceToDb(svc, teamId, cloud, cluster) {
    const serviceId = { teamId: teamId, serviceId: svc.name }

    try {
      // Update service cloud and cluster assignment
      const existingService = this.getService(serviceId)
      this.assignCluster(existingService, cloud, cluster)
      this.updateService(serviceId, existingService)
    } catch (err) {
      // Create service
      svc['serviceType'] = {}
      if ('ksvc' in svc) {
        svc.serviceType['ksvc'] = svc.ksvc
        delete svc.ksvc
      }
      if ('svc' in svc) {
        svc.serviceType.svc = svc.svc
        delete svc.svc
      }

      this.assignCluster(svc, cloud, cluster)
      this.createService(serviceId, svc)
    }
  }

  setPasswordIfNotExist(team) {
    if (team.password)
      return
    // Generate password
    team.password = generatePassword(16, false)
  }

  saveValues() {
    const clusters = this.getClusters()
    this.saveAllTeamValues(clusters)
  }

  saveAllTeamValues(clusters) {
    _.forIn(clusters, (cloudName, cloudClusters) => {
      _.forEach(cloudClusters, (clusterName) => {
        const values = this.convertDbToValues(cloudName, clusterName)
        const path = this.getValueFilePath(cloudName, clusterName)
        this.repo.writeFile(path, values)
      })
    })
  }

  convertDbToValues(cloud, cluster) {
    const teams = {}
    this.getTeams().forEach(el => {
      const clusters = _.get(el, `clusters.${cloud}`, [])
      if (!_.includes(clusters, cluster))
        return

      const teamCloned = _.omit(el, ['teamId', 'clusters'])
      this.setPasswordIfNotExist(teamCloned)
      const id = el.teamId
      teams[id] = teamCloned
      let dbServices = this.getServices({ teamId: id })
      let services = new Array()

      dbServices.forEach(svc => {
        const svcCloned = _.omit(svc, ['teamId', 'serviceId', 'serviceType', 'clusters'])

        if ('ksvc' in svc.serviceType)
          svcCloned['ksvc'] = svc.serviceType.ksvc
        if ('svc' in svc.serviceType)
          svcCloned['svc'] = svc.serviceType.svc

        services.push(svcCloned)
      })

      teams[id].services = services
    })

    const values = {
      teamConfig: { teams: teams },
    }
    return values
  }
}

module.exports = {
  OtomiStack: OtomiStack,
};