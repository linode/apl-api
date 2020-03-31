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

  checkIfTeamExists(ids) {
    this.db.getItem('teams', ids)
  }

  checkIfServiceExists(ids) {
    this.db.getItem('services', ids)
  }

  createTeam(data) {
    const ids = { teamId: data.name }
    this.setPasswordIfNotExist(data)
    return this.db.createItem('teams', ids, data)
  }

  editTeam(teamId, data) {
    const ids = { teamId }
    this.checkIfTeamExists(ids)
    return this.db.updateItem('teams', ids, data)
  }

  deleteTeam(teamId) {
    const ids = { teamId }
    this.checkIfTeamExists(ids)
    this.db.deleteItem('services', ids)
    return this.db.deleteItem('teams', ids)
  }

  getTeamServices(teamId) {
    const ids = { teamId }
    this.checkIfTeamExists(ids)
    return this.db.getCollection('services', ids)
  }

  getAllServices() {
    return this.db.getCollection('services')
  }

  createService(teamId, data) {
    this.checkIfTeamExists({ teamId })
    const ids = { teamId, serviceId: getServiceId(teamId, data.name) }
    return this.db.createItem('services', ids, data)
  }

  createDefaultService(data) {
    return this.db.createItem('defaultServices', {}, data)
  }

  getDefaultServices() {
    return this.db.getCollection('defaultServices')
  }

  getService(teamId, name) {
    const ids = { teamId, name }
    return this.db.getItem('services', ids)
  }

  editService(teamId, name, data) {
    const ids = { teamId, name }
    this.checkIfServiceExists(ids)
    return this.db.updateItem('services', ids, data)
  }

  deleteService(teamId, name) {
    const ids = { teamId, name }
    this.checkIfServiceExists(ids)
    return this.db.deleteItem('services', ids)
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
      this.editTeam(teamId, team)
    } catch (err) {
      // Here we create a team in DB
      let rawTeam = _.omit(teamData, 'services')
      this.assignCluster(rawTeam, cluster)
      this.createTeam(rawTeam)
    }

    if (!teamData.services) {
      const path = this.getValueFilePath(cluster)
      console.warn(`Missing 'services' key for team ${teamId} in ${path} file. Skipping.`)
      return
    }
    this.convertTeamValuesServicesToDb(teamData.services, teamId, cluster)
  }

  convertTeamValuesServicesToDb(services, teamId, cluster) {
    services.forEach((svc) => {
      this.convertServiceToDb(svc, teamId, cluster)
    })
  }

  convertServiceToDb(svcRaw, teamId, cluster) {
    // Create service
    let svc = _.omit(svcRaw, 'ksvc', 'svc', 'isPublic', 'internal', 'hasCert')
    svc.spec = {}

    if ('ksvc' in svcRaw) {
      svc.spec = _.cloneDeep(svcRaw.ksvc)
      if (!svcRaw.predeployed) {
        const annotations = _.get(svcRaw.ksvc, 'annotations', {})
        svc.spec.annotations = utils.objectToArray(annotations, 'name', 'value')
      }
    } else if ('svc' in svcRaw) {
      svc.spec = _.cloneDeep(svcRaw.svc)
    } else {
      console.warn('Unknown service structure')
    }

    if ('internal' in svcRaw) {
      svc.ingress = { internal: true }
    } else {
      svc.ingress = {
        hasCert: 'hasCert' in svcRaw,
        hasSingleSignOn: !('isPublic' in svcRaw),
        certArn: svcRaw.certArn,
      }
    }

    svc.clusterId = cluster.id
    svc.teamId = teamId
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
    _.forEach(clusters, (cluster) => {
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
    this.getTeams().forEach((team) => {
      if (!this.inCluster(team, cluster)) return

      const teamCloned = _.omit(team, ['teamId', 'clusters'])
      const id = team.teamId
      teams[id] = teamCloned
      let dbServices = this.getTeamServices(id)
      let services = new Array()

      dbServices.forEach((svc) => {
        if (cluster.id !== svc.clusterId) return

        const svcCloned = _.omit(svc, ['_id', 'teamId', 'spec', 'ingress', 'serviceId', 'clusterId'])
        const spec = (svcCloned.ksvc = _.omit(svc.spec, 'serviceType'))
        if (svc.spec.predeployed) {
          svcCloned.ksvc = spec
        } else if (svc.spec.image) {
          svcCloned.ksvc = spec
          const annotations = _.get(svc.spec, 'annotations', [])
          svcCloned.ksvc.annotations = utils.arrayToObject(annotations, 'name', 'value')
        } else if (svc.spec.name) {
          svcCloned.svc = spec
        } else {
          console.warn(`Unknown service structure: ${JSON.stringify(svc)}`)
        }

        if (svc.ingress.internal) svcCloned.internal = true

        if (!svc.ingress.hasSingleSignOn) svcCloned.isPublic = true

        if (svc.ingress.hasCert) svcCloned.hasCert = true

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
