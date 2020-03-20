const generatePassword = require('password-generator')
const _ = require('lodash')
const path = require('path')
const utils = require('./utils')

const getServiceId = (teamId, svcName) => `${teamId}/${svcName}`

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
      console.error('Unable to init app', e)
      return false
    }
    return true
  }

  getValueFilePath(cluster) {
    const clusterFilename = cluster.cluster + '.yaml'
    const fPath = path.join(this.envPath, cluster.cloud, clusterFilename)
    return fPath
  }

  getTeams() {
    return this.db.getCollection('teams')
  }

  getClusters() {
    return this.db.getCollection('clusters')
  }

  getTeam(teamId) {
    return this.db.getItem('teams', { teamId })
  }

  updateTeam(teamId, data) {
    this.db.updateItem('teams', { teamId }, data)
  }

  checkIfTeamExists(teamId) {
    this.db.getItem('teams', { teamId })
  }

  createTeam(data) {
    this.setPasswordIfNotExist(data)
    return this.db.createItem('teams', { teamId: data.name }, data)
  }

  editTeam(teamId, data) {
    return this.db.updateItem('teams', { teamId }, data)
  }

  deleteTeam(teamId) {
    this.db.deleteItem('services', { teamId })
    return this.db.deleteItem('teams', { teamId })
  }

  getTeamServices(teamId) {
    this.checkIfTeamExists(teamId)
    return this.db.getCollection('services', { teamId })
  }

  getAllServices() {
    return this.db.getCollection('services')
  }

  createService(teamId, data) {
    this.checkIfTeamExists(teamId)
    return this.db.createItem('services', { teamId, serviceId: getServiceId(teamId, data.name) }, data)
  }

  createDefaultService(data) {
    return this.db.createItem('defaultServices', {}, data)
  }

  getDefaultServices() {
    return this.db.getCollection('defaultServices')
  }

  getService(teamId, name) {
    this.checkIfTeamExists(teamId)
    return this.db.getItem('services', { teamId, name })
  }

  editService(teamId, name, data) {
    return this.db.updateItem('services', { teamId, name }, data)
  }

  deleteService(teamId, name) {
    this.checkIfTeamExists(teamId)
    return this.db.deleteItem('services', { teamId, name })
  }

  getDeployments(params) {}

  async triggerDeployment(userGroup) {
    this.saveValues()
    await this.repo.commit(userGroup)
    return await this.repo.push()
  }

  loadValues() {
    const coreValues = this.repo.readFile(this.clustersPath)
    this.convertCoreValuesToDb(coreValues)

    const clusters = this.getClusters()
    this.loadAllTeamValues(clusters)
  }

  loadAllTeamValues(clusters) {
    _.forEach(clusters, cluster => {
      try {
        const path = this.getValueFilePath(cluster)
        const values = this.repo.readFile(path)
        const teams = _.get(values, 'teamConfig.teams', null)
        if (!teams) {
          console.warn(`Missing 'teams' key in ${path} file. Skipping`)
          return
        }
        this.loadTeamsValues(values.teamConfig.teams, cluster)
      } catch (e) {
        console.error(`Unable to load teams data for cluster ${cluster.id}`, e)
        return
      }
    })
  }

  convertCoreValuesToDb(values) {
    const cs = values.clouds
    _.forIn(cs, (cloudObj, cloud) => {
      _.forIn(cloudObj.clusters, (clusterObject, cluster) => {
        const clusterId = `${cluster}/${cloud}`
        const clusterObj = {
          cloud: cloud,
          cluster: cluster,
          domain: `${cluster}.${cloudObj.domain}`,
          k8sVersion: clusterObject.k8sVersion,
          region: clusterObject.region,
        }
        console.log(clusterObj)
        this.db.createItem('clusters', { id: clusterId }, clusterObj)
      })
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

    try {
      // Here we only update clusters
      let team = this.getTeam(teamId)
      this.assignCluster(team, cluster)
      this.updateTeam(teamId, team)
    } catch (err) {
      // Here we create a team in DB
      let rawTeam = _.omit(teamData, 'services')
      this.assignCluster(rawTeam, cluster)
      this.createTeam(rawTeam)
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
    svc.clusterId = cluster.id
    this.createService(teamId, svc)
  }

  setPasswordIfNotExist(team) {
    if (team.password) return
    team.password = generatePassword(16, false)
  }

  saveValues() {
    const clusters = this.getClusters()
    this.saveAllTeamValues(clusters)
  }

  saveAllTeamValues(clusters) {
    _.forEach(clusters, cluster => {
      const values = this.convertDbToValues(cluster)
      const path = this.getValueFilePath(cluster)
      this.repo.writeFile(path, values)
    })
  }

  inCluster(obj, cluster) {
    const clusters = _.get(obj, 'clusters', [])
    return _.indexOf(clusters, cluster.id) != -1
  }

  convertDbToValues(cluster) {
    const teams = {}
    this.getTeams().forEach(team => {
      if (!this.inCluster(team, cluster)) return

      const teamCloned = _.omit(team, ['teamId', 'clusters'])
      const id = team.teamId
      teams[id] = teamCloned
      let dbServices = this.getTeamServices(id)
      let services = new Array()

      dbServices.forEach(svc => {
        if (cluster.id !== svc.clusterId) return

        const svcCloned = _.omit(svc, ['teamId', 'serviceId', 'serviceType', 'clusterId', 'annotations'])

        if ('ksvc' in svc.serviceType) svcCloned.ksvc = svc.serviceType.ksvc
        svcCloned.ksvc.annotations = utils.arrayToObject(svcCloned.ksvc.annotations, 'name', 'value')

        if ('svc' in svc.serviceType) svcCloned['svc'] = svc.serviceType.svc

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
}
