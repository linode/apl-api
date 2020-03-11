var generatePassword = require('password-generator');
var _ = require('lodash');
var path = require('path')
var utils = require('./utils')
class OtomiStack {
  constructor(repo, db) {
    this.db = db
    this.repo = repo
    this.envPath = './env/'
    this.clustersPath = './env/clusters.yaml'
  }

  async init() {
    try {
      await this.repo.clone()
      this.loadValues()
    } catch (e) {
      console.error("Unable to init app", e);
      return false
    }
    return true
  }

  getValueFilePath(cluster) {
    const clusterFilename = cluster.clusterName + '.yaml'
    const fPath = path.join(this.envPath, cluster.cloudName, clusterFilename)
    return fPath
  }

  getTeams() {
    const res_data = this.db.getCollection('teams')
    return res_data
  }

  getClusters() {
    const res_data = this.db.getCollection('clusters')
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
    this.setPasswordIfNotExist(data)
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
    const core_values = this.repo.readFile(this.clustersPath)
    this.convertCoreValuesToDb(core_values)

    const clusters = this.getClusters()
    this.loadAllTeamValues(clusters)
  }

  loadAllTeamValues(clusters) {

    _.forEach(clusters, (cluster) => {
      try {
        const path = this.getValueFilePath(cluster)
        const values = this.repo.readFile(path)
        const teams = _.get(values, 'teamConfig.teams', null)
        if (!teams) {
          console.warn(`Missing 'teams' key in ${path} file. Skipping`)
          return
        }
        this.loadTeamsValues(values.teamConfig.teams, cluster)
      }
      catch(e) {
        console.error(`Unable to load teams data for cluster ${cluster.id}`, e)
        return
      }
    })
  }

  convertCoreValuesToDb(values) {
    const cs = values.clouds
    _.forIn(cs, (cloudObj, cloudName) => {
      _.forIn(cloudObj.clusters, (clusterObject, clusterName) => {
        const cluster_id = `${clusterName}/${cloudName}`
        const cluster = {
          cloudName: cloudName, 
          clusterName: clusterName,
          domain: `${clusterName}.${cloudObj.domain}`,
          k8sVersion: clusterObject.k8sVersion,
          region: clusterObject.region,
        }
        console.log(cluster);
        this.db.createItem('clusters', {id: cluster_id}, cluster)
      });
    })
  }

  loadTeamsValues(teams, cluster) {
    // console.debug(teams)
    _.forIn(teams, (teamData, teamId) => {
      // console.log(`${teamId}:${teamData}`)
      this.convertTeamToDb(teamData, teamId, cluster)
    })
  }

  assignCluster(obj, cluster) {
    const clusters = _.get(obj, 'clusters', [])
    clusters.push(cluster.id)
    _.set(obj, 'clusters', clusters)
  }

  convertTeamToDb(teamData, teamId, cluster) {

    // console.log(`${teamId}: ${teamData}`);
    // console.debug(JSON.stringify(teamData))

    const id = { teamId: teamId }
    try {
      // Here we only update clusters
      let team = this.getTeam(id)
      this.assignCluster(team, cluster)
      this.updateTeam(id, team)
    } catch (err) {
      // Here we create a team in DB
      let rawTeam = _.omit(teamData, 'services')
      this.assignCluster(rawTeam, cluster)
      this.createTeam(id, rawTeam)
    }

    if (!teamData.services) {
      path = this.getValueFilePath(cluster)
      console.warn(`Missing 'services' key for team ${teamId} in ${path} file. Skipping.`)
      return
    }
    this.convertTeamValuesServicesToDb(teamData.services, teamId, cluster)
  }

  convertTeamValuesServicesToDb(services, teamId, cluster) {
    services.forEach(svc => {
      this.convertServiceToDb(svc, teamId, cluster)
    })
  }

  convertServiceToDb(svc, teamId, cluster) {
    const serviceId = { teamId: teamId, serviceId: svc.name }

    try {
      // Update service cloud and cluster assignment
      const existingService = this.getService(serviceId)
      this.assignCluster(existingService, cluster)
      this.updateService(serviceId, existingService)
    } catch (err) {
      // Create service
      svc['serviceType'] = {}
      if ('ksvc' in svc) {
        svc.serviceType.ksvc = svc.ksvc
        svc.serviceType.ksvc.annotations = utils.objectToArray(svc.serviceType.ksvc.annotations, 'name', 'value')
        delete svc.ksvc
      }
      if ('svc' in svc) {
        svc.serviceType.svc = svc.svc
        delete svc.svc
      }

      this.assignCluster(svc, cluster)
      this.createService(serviceId, svc)
    }
  }

  setPasswordIfNotExist(team) {
    if (team.password)
      return
    team.password = generatePassword(16, false)
  }

  saveValues() {
    const clusters = this.getClusters()
    this.saveAllTeamValues(clusters)
  }

  saveAllTeamValues(clusters) {
    _.forEach(clusters, (cluster) => {
      const values = this.convertDbToValues(cluster)
      const path = this.getValueFilePath(cluster)
      this.repo.writeFile(path, values)
    })
  }

  is_at_cluster(obj, cluster) {
    const clusters = _.get(obj, 'clusters', [])
    const res = (_.indexOf(clusters, cluster.id) != -1)
    return res
  }

  convertDbToValues(cluster) {
    const teams = {}
    this.getTeams().forEach(team => {
      if (!this.is_at_cluster(team, cluster))
        return

      const teamCloned = _.omit(team, ['teamId', 'clusters'])
      const id = team.teamId
      teams[id] = teamCloned
      let dbServices = this.getServices({ teamId: id })
      let services = new Array()

      dbServices.forEach(svc => {
        if (!this.is_at_cluster(svc, cluster))
          return

        const svcCloned = _.omit(svc, ['teamId', 'serviceId', 'serviceType', 'clusters', 'annotations'])

        if ('ksvc' in svc.serviceType)
          svcCloned.ksvc = svc.serviceType.ksvc
          svcCloned.ksvc.annotations = utils.arrayToObject(svcCloned.ksvc.annotations, 'name', 'value')

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