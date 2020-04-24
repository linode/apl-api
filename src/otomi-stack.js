const generatePassword = require('password-generator')
const fs = require('fs')
const yaml = require('js-yaml')
const _ = require('lodash')
const err = require('./error')
const path = require('path')
const utils = require('./utils')
const db = require('./db')
const repo = require('./repo')

const env = process.env
const isProduction = env.NODE_ENV === 'production'
console.log('NODE_ENV: ', env.NODE_ENV)

const baseGlobal = { teamConfig: { teams: {} } }
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
  const globalProps = ['name', 'password', 'receiver', 'azure']
  _.forEach(t, (team, teamId) => {
    if (!g[teamId]) g[teamId] = {}
    globalProps.forEach((prop) => {
      if (prop === 'password' && !g[teamId].password) {
        g[teamId].password = generatePassword(16, false)
      } else {
        if (team[prop] !== undefined) g[teamId][prop] = team[prop]
      }
      delete t[teamId][prop]
    })
  })
}

class OtomiStack {
  constructor() {
    this.repo = repo.init(
      env.GIT_LOCAL_PATH,
      env.GIT_REPO_URL,
      env.GIT_USER,
      env.GIT_EMAIL,
      env.GIT_PASSWORD,
      env.GIT_BRANCH,
    )
    this.initDb()
    this.clustersPath = './env/clusters.yaml'
    const corePath = isProduction ? '/etc/otomi/core.yaml' : './test/core.yaml'
    this.coreValues = yaml.safeLoad(fs.readFileSync(corePath, 'utf8'))
  }

  initDb() {
    this.db = db.init(env.DB_PATH)
  }

  async init() {
    try {
      await this.repo.clone()
      const globalPath = getFilePath()
      glbl = this.repo.readFile(globalPath)
      this.loadValues()
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

  getCore() {
    return this.coreValues
  }

  getTeam(teamId) {
    return this.db.getItem('teams', { teamId })
  }

  createTeam(teamId, data) {
    const ids = { teamId: teamId || data.name.toLowerCase().replace(' ', '-') }
    return this.db.createItem('teams', ids, data)
  }

  editTeam(teamId, data) {
    const ids = { teamId }
    return this.db.updateItem('teams', ids, data)
  }

  deleteTeam(teamId) {
    const ids = { teamId }
    try {
      this.db.deleteItem('services', ids)
    } catch (e) {
      // no services found
    }
    this.db.deleteItem('teams', ids)
    delete glbl.teamConfig.teams[teamId]
  }

  getTeamServices(teamId) {
    const ids = { teamId }
    return this.db.getCollection('services', ids)
  }

  getAllServices() {
    return this.db.getCollection('services')
  }

  createService(data) {
    const { name, clusterId, teamId } = data
    const ids = { serviceId: `${clusterId}/${teamId}/${name}` }
    this.validateService(data)
    return this.db.createItem('services', ids, data)
  }

  createDefaultService(data) {
    return this.db.createItem('defaultServices', {}, data)
  }

  getDefaultServices() {
    return this.db.getCollection('defaultServices')
  }

  getService(serviceId) {
    return this.db.getItem('services', { serviceId })
  }

  editService(serviceId, data) {
    this.validateService(data)
    return this.db.updateItem('services', { serviceId }, data)
  }

  deleteService(serviceId) {
    return this.db.deleteItem('services', { serviceId })
  }

  validateService(data) {
    if (this.isPublicUrlInUse(data)) throw new err.PublicUrlExists('Public URL is already used')
  }

  isPublicUrlInUse(data) {
    if (!data.ingress) return false

    const services = this.db.getCollection('services')

    const servicesFiltered = _.filter(services, (svc) => {
      const subdomain = _.get(svc, 'ingress.subdomain')
      const domain = _.get(svc, 'ingress.domain')
      const existingUrl = `${subdomain}.${domain}`
      const url = `${data.ingress.subdomain}.${data.ingress.domain}`
      return existingUrl === url && svc.serviceId !== data.serviceId
    })

    if (servicesFiltered.length === 0) return false

    return true
  }

  async triggerDeployment(teamId, email) {
    this.saveValues()
    await this.repo.commit(teamId, email)
    await this.repo.push()
    this.saveValues()
    // reset db and load values again
    this.initDb()
    this.loadValues()
  }

  loadValues() {
    const clusterValues = this.repo.readFile(this.clustersPath)
    this.convertClusterValuesToDb(clusterValues)
    const clusters = this.getClusters()
    this.loadAllTeamValues(clusters)
    this.db.setDirtyActive()
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

  convertClusterValuesToDb(values) {
    const cs = values.clouds
    _.forIn(cs, (cloudObj, cloud) => {
      const dnsZones = [cloudObj.domain].concat(_.get(cloudObj, 'dnsZones', []))
      _.forIn(cloudObj.clusters, (clusterObject, cluster) => {
        const clusterId = `${cloud}/${cluster}`
        const clusterObj = {
          cloud: cloud,
          cluster: cluster,
          dnsZones: dnsZones,
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
    let team
    try {
      team = this.getTeam(teamId)
      this.assignCluster(team, cluster)
      this.editTeam(teamId, team)
    } catch (e) {
      const rawTeam = _.omit(teamData, 'services')
      this.assignCluster(rawTeam, cluster)
      this.createTeam(teamId, { ...rawTeam, ...glbl.teamConfig.teams[teamId] })
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
    let svc = _.omit(svcRaw, 'ksvc', 'isPublic', 'hasCert', 'domain')
    svc.clusterId = cluster.id
    svc.teamId = teamId
    if (!('name' in svcRaw)) {
      console.warn('Unknown service structure')
    }
    if ('ksvc' in svcRaw) {
      if ('predeployed' in svcRaw.ksvc) {
        _.set(svc, 'ksvc.serviceType', 'ksvcPredeployed')
      } else {
        svc.ksvc = _.cloneDeep(svcRaw.ksvc)
        svc.ksvc.serviceType = 'ksvc'
        const annotations = _.get(svcRaw.ksvc, 'annotations', {})
        svc.ksvc.annotations = utils.objectToArray(annotations, 'name', 'value')
      }
    } else _.set(svc, 'ksvc.serviceType', 'svcPredeployed')

    if (!('internal' in svcRaw)) {
      const publicUrl = utils.getPublicUrl(svcRaw.domain, svcRaw.name, teamId, cluster)
      svc.ingress = {
        hasCert: 'hasCert' in svcRaw,
        hasSingleSignOn: !('isPublic' in svcRaw),
        certArn: svcRaw.certArn,
        domain: publicUrl.domain,
        subdomain: publicUrl.subdomain,
      }
    }

    const serviceId = `${cluster.id}/${teamId}/${svc.name}`
    console.log(`Loading service: serviceName: ${serviceId}, serviceType ${svc.ksvc.serviceType}`)
    try {
      const service = this.getService(serviceId)
      const data = { ...service, svc }
      this.db.updateItem('services', { serviceId }, data)
    } catch (e) {
      this.createService(svc)
    }
  }

  saveValues() {
    const clusters = this.getClusters()
    _.forEach(clusters, (cluster) => {
      const { cloud, cluster: clusterName } = cluster
      const teamValues = this.convertTeamsToValues(cluster)
      splitGlobal(teamValues)
      const path = getFilePath(cloud, clusterName)
      const values = this.repo.readFile(path)
      const newValues = { ...values, ...teamValues }
      this.repo.writeFile(path, newValues)
    })
    // now also write the globals back
    const path = getFilePath()
    const values = this.repo.readFile(path)
    const newValues = _.omit({ ...values, ...glbl }, _.isUndefined)
    this.repo.writeFile(path, newValues)
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

        const serviceType = svc.ksvc.serviceType
        console.info(`Saving service: serviceId: ${svc.serviceId} serviceType: ${serviceType}`)
        const svcCloned = _.omit(svc, ['teamId', 'serviceId', 'clusterId', 'ksvc', 'ingress', 'internal'])
        const ksvc = _.cloneDeep(svc.ksvc)
        if (serviceType === 'ksvc') {
          svcCloned.ksvc = ksvc
          delete svcCloned.ksvc.serviceType
          const annotations = _.get(svc.ksvc, 'annotations', [])
          svcCloned.ksvc.annotations = utils.arrayToObject(annotations, 'name', 'value')
        } else if (serviceType === 'ksvcPredeployed') {
          svcCloned.ksvc = { predeployed: true }
        } else if (serviceType !== 'svcPredeployed') {
          console.warn(`Saving service failure: Not supported service type: ${serviceType}`)
        }
        if (svc.ingress && !_.isEmpty(svc.ingress)) {
          svcCloned.domain = `${svc.ingress.subdomain}.${svc.ingress.domain}`

          if (!svc.ingress.hasSingleSignOn) svcCloned.isPublic = true

          if (svc.ingress.hasCert) svcCloned.hasCert = true
          if (svc.ingress.certArn) svcCloned.certArn = svc.ingress.certArn
        } else svcCloned.internal = true

        services.push(svcCloned)
      })

      teams[id].services = services
    })

    const values = {
      teamConfig: { teams },
    }
    return values
  }
}

module.exports = OtomiStack
