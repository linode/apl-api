const generatePassword = require('password-generator')
const _ = require('lodash')
const path = require('path')
const utils = require('./utils')

const baseGlobal = { teamValues: { teamConfig: {} } }
let glbl = { ...baseGlobal }

const getFilePath = (cloud = null, cluster = null) => {
  let file
  if (cloud) {
    if (cluster) file = `${cloud}/${cluster}.yaml`
    else file = `${cloud}/default.yaml`
  } else file = 'default.yaml'
  return path.join('./env/', file)
}

function splitGlobal(teamValues) {
  const t = teamValues.teamConfig.teams
  const g = glbl.teamConfig.teams
  const globalProps = ['name', 'password']
  _.forEach(t, (team, teamId) => {
    if (!g[teamId]) g[teamId] = {}
    globalProps.forEach((prop) => {
      if (prop === 'password') {
        if (!g[teamId].password) g[teamId].password = generatePassword(16, false)
      } else {
        g[teamId][prop] = team[prop]
        delete t[teamId][prop]
      }
    })
  })
}

class OtomiStack {
  constructor(repo, db) {
    this.db = db
    this.repo = repo
    this.clustersPath = './env/clusters.yaml'
  }

  async init() {
    try {
      await this.repo.clone()
      this.loadValues()
      const globalPath = getFilePath()
      glbl = this.repo.readFile(globalPath)
    } catch (e) {
      console.error('Unable to init app', e)
      return false
    }
    return true
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
    return !!this.db.getItem('teams', ids)
  }

  checkIfServiceExists(ids) {
    return !!this.db.getItem('services', ids)
  }

  createTeam(data) {
    const ids = { teamId: data.teamId }
    data.name = data.name || data.teamId
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
    const ids = { teamId, name: data.name, clusterId: data.clusterId }
    return this.db.createItem('services', ids, data)
  }

  createDefaultService(data) {
    return this.db.createItem('defaultServices', {}, data)
  }

  getDefaultServices() {
    return this.db.getCollection('defaultServices')
  }

  getService(teamId, name, clusterId) {
    const ids = { teamId, name, clusterId }
    return this.db.getItem('services', ids)
  }

  editService(teamId, name, clusterId, data) {
    const ids = { teamId, name, clusterId }
    this.checkIfServiceExists(ids)
    return this.db.updateItem('services', ids, data)
  }

  deleteService(teamId, name, clusterId) {
    const ids = { teamId, name, clusterId }
    this.checkIfServiceExists(ids)
    return this.db.deleteItem('services', ids)
  }

  getDeployments(params) {}

  async triggerDeployment(teamId, email) {
    this.saveValues()
    await this.repo.commit(teamId, email)
    return await this.repo.push()
  }

  loadValues() {
    const coreValues = this.repo.readFile(this.clustersPath)
    this.convertCoreValuesToDb(coreValues)
    const clusters = this.getClusters()
    this.loadAllTeamValues(clusters)
  }

  loadFileValues(cluster, path) {
    const values = this.repo.readFile(path)
    const teams = _.get(values, 'teamConfig.teams', null)
    if (!teams) {
      console.info(`Missing 'teamConfig.teams' key in ${path} file. Skipping`)
      return
    }
    this.loadTeamsValues(values.teamConfig.teams, cluster)
  }

  loadAllTeamValues(clusters) {
    console.log('loadAllTeamValues')
    const loaded = []
    _.forEach(clusters, (cluster) => {
      const { cloud, cluster: clusterName } = cluster
      if (!loaded.includes(cloud)) {
        const cloudFile = getFilePath(cloud)
        console.log('loading: ', cloudFile)
        this.loadFileValues(cluster, cloudFile)
        loaded.push(cloud)
      }
      const clusterFile = getFilePath(cloud, clusterName)
      this.loadFileValues(cluster, clusterFile)
    })
  }

  convertCoreValuesToDb(values) {
    const cs = values.clouds
    _.forIn(cs, (cloudObj, cloud) => {
      _.forIn(cloudObj.clusters, (clusterObject, cluster) => {
        const clusterId = `${cloud}/${cluster}`
        const clusterObj = {
          cloud: cloud,
          cluster: cluster,
          domain: `${cluster}.${cloudObj.domain}`,
          k8sVersion: clusterObject.k8sVersion,
          hasKnative: clusterObject.hasKnative !== undefined ? clusterObject.hasKnative : true,
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
    let team = this.db.getItem('teams', { teamId })
    if (team) {
      this.assignCluster(team, cluster)
      this.editTeam(teamId, team)
    } else {
      const rawTeam = _.omit(teamData, 'services')
      rawTeam.teamId = teamId
      this.assignCluster(rawTeam, cluster)
      this.createTeam(rawTeam)
    }

    if (!teamData.services) {
      const path = getFilePath(cluster)
      console.info(`Missing 'services' key for team ${teamId} in ${path} file. Skipping.`)
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
      if (!('predeployed' in svcRaw.ksvc)) {
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
    const service = this.getService(teamId, svc.name, cluster.id)
    if (service) {
      const data = { ...service, svc }
      this.db.updateItem('services', { teamId }, data)
    } else this.createService(teamId, svc)
  }

  saveValues() {
    const clusters = this.getClusters()
    this.saveAllTeamValues(clusters)
  }

  saveAllTeamValues(clusters) {
    _.forEach(clusters, (cluster) => {
      const { cloud, cluster: clusterName } = cluster
      const teamValues = this.convertTeamsToValues(cluster)
      splitGlobal(teamValues)
      const path = getFilePath(cloud, clusterName)
      const values = this.repo.readFile(path)
      const newValues = { ...values, ...teamValues }
      this.repo.writeFile(path, newValues)
    })
    const path = getFilePath()
    const values = this.repo.readFile(path)
    const newValues = { ...values, ...glbl }
    this.repo.writeFile(path, newValues)
    glbl = { ...baseGlobal }
  }

  inCluster(obj, cluster) {
    const clusters = _.get(obj, 'clusters', [])
    return _.indexOf(clusters, cluster.id) != -1
  }

  convertTeamsToValues(cluster) {
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

        const svcCloned = _.omit(svc, ['teamId', 'spec', 'ingress', 'clusterId'])
        const spec = _.cloneDeep(svc.spec)
        if ('predeployed' in spec) {
          svcCloned.ksvc = spec
        } else if ('image' in spec) {
          svcCloned.ksvc = spec
          const annotations = _.get(svc.spec, 'annotations', [])
          svcCloned.ksvc.annotations = utils.arrayToObject(annotations, 'name', 'value')
        } else if ('name' in spec) {
          svcCloned.svc = spec
        } else {
          console.warn(`Dump service to value file: unknown service structure: ${JSON.stringify(spec)}`)
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
