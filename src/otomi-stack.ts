import * as k8s from '@kubernetes/client-node'
import dotEnv from 'dotenv'
import fs from 'fs'
import yaml from 'js-yaml'
import { findIndex } from 'lodash'
import cloneDeep from 'lodash/cloneDeep'
import filter from 'lodash/filter'
import forEach from 'lodash/forEach'
import forIn from 'lodash/forIn'
import get from 'lodash/get'
import indexOf from 'lodash/indexOf'
import isEmpty from 'lodash/isEmpty'
import isUndefined from 'lodash/isUndefined'
import omit from 'lodash/omit'
import omitBy from 'lodash/omitBy'
import set from 'lodash/set'
import generatePassword from 'password-generator'
import path from 'path'
import db, { Db } from './db'
import { AlreadyExists, NotExistError, PublicUrlExists } from './error'
import { arrayToObject, getPublicUrl, objectToArray } from './utils'
import cloneRepo, { Repo } from './repo'

dotEnv.config()

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
  const globalProps = ['id', 'password', 'receiver', 'azure']
  forEach(t, (team, teamId) => {
    if (!g[teamId]) g[teamId] = {}
    globalProps.forEach((prop) => {
      if (prop === 'password' && !g[teamId].password) {
        g[teamId].password = generatePassword(16, false)
      } else if (team[prop] !== undefined) g[teamId][prop] = team[prop]
      delete t[teamId][prop]
    })
  })
}

export default class OtomiStack {
  clustersPath: string

  private coreValues: any

  db: Db

  repo: Repo

  constructor() {
    this.db = db(env.DB_PATH)
    this.clustersPath = './env/clusters.yaml'
    const corePath = isProduction ? '/etc/otomi/core.yaml' : './test/core.yaml'
    this.coreValues = yaml.safeLoad(fs.readFileSync(corePath, 'utf8'))
  }

  async init() {
    try {
      this.repo = await cloneRepo(
        env.GIT_LOCAL_PATH,
        env.GIT_REPO_URL,
        env.GIT_USER,
        env.GIT_EMAIL,
        env.GIT_PASSWORD,
        env.GIT_BRANCH,
      )
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

  getTeam(id) {
    return this.db.getItem('teams', { id })
  }

  createTeam(data) {
    const { id } = data
    return this.db.createItem('teams', data, { id }, id)
  }

  editTeam(id, data) {
    return this.db.updateItem('teams', data, { id })
  }

  deleteTeam(id) {
    try {
      this.db.deleteItem('services', { id })
    } catch (e) {
      // no services found
    }
    this.db.deleteItem('teams', { id })
    delete glbl.teamConfig.teams[id]
  }

  getTeamServices(teamId: string) {
    const ids = { teamId }
    return this.db.getCollection('services', ids)
  }

  getAllServices() {
    return this.db.getCollection('services')
  }

  createService(teamId, data) {
    this.checkPublicUrlInUse(data)
    return this.db.createItem('services', { ...data, teamId })
  }

  getService(id) {
    return this.db.getItem('services', { id })
  }

  editService(id, data) {
    this.checkPublicUrlInUse(data)
    const oldData = this.getService(id)
    if (data.name !== oldData.name) {
      this.deleteService(id)
      // eslint-disable-next-line no-param-reassign
      delete data.id
      return this.createService(data.teamId, data)
    }
    return this.db.updateItem('services', data, { id })
  }

  deleteService(id) {
    return this.db.deleteItem('services', { id })
  }

  checkPublicUrlInUse(data) {
    if (!data.ingress) return

    const services = this.db.getCollection('services')

    const servicesFiltered = filter(services, (svc) => {
      if (!svc.ingress) return false
      const { domain, subdomain, path } = svc.ingress
      const existingUrl = `${subdomain}.${domain}${path || ''}`
      const url = `${data.ingress.subdomain}.${data.ingress.domain}${data.ingress.path || ''}`
      return existingUrl === url && svc.serviceId !== data.serviceId
    })

    if (servicesFiltered.length !== 0) throw new PublicUrlExists('Public URL is already used')
  }

  async triggerDeployment(teamId: string, email: string) {
    console.log('DISABLE_SYNC: ', env.DISABLE_SYNC)
    this.saveValues()

    if (!env.DISABLE_SYNC) {
      await this.repo.save(teamId, email)
    }
  }

  apiClient = undefined

  getApiClient(): k8s.CoreV1Api {
    if (this.apiClient) return this.apiClient
    const kc = new k8s.KubeConfig()
    kc.loadFromDefault()
    this.apiClient = kc.makeApiClient(k8s.CoreV1Api)
    return this.apiClient
  }

  // eslint-disable-next-line class-methods-use-this
  async getKubecfg(teamId): Promise<k8s.KubeConfig> {
    const client = this.getApiClient()
    const namespace = `team-${teamId}`
    const saRes = await client.readNamespacedServiceAccount('default', namespace)
    const { body: sa }: { body: k8s.V1ServiceAccount } = saRes
    const { secrets }: { secrets?: any[] } = sa
    const secretName: string = secrets[0].name
    const secretRes = await client.readNamespacedSecret(secretName, namespace)
    const { body: secret }: { body: k8s.V1Secret } = secretRes
    const token = Buffer.from(secret.data.token, 'base64').toString('ascii')
    const cluster = {
      name: env.CLUSTER_NAME,
      server: `https://${env.CLUSTER_APISERVER}`,
      skipTLSVerify: true,
    }

    const user = {
      name: `${namespace}-${env.CLUSTER_NAME}`,
      token,
    }

    const context = {
      name: `${namespace}-${env.CLUSTER_NAME}`,
      namespace,
      user: user.name,
      cluster: cluster.name,
    }
    const options = {
      clusters: [cluster],
      users: [user],
      contexts: [context],
      currentContext: context.name,
    }
    const config = new k8s.KubeConfig()
    config.loadFromOptions(options)
    return config
  }

  createSecret(teamId, data, scope = 'global') {
    return this.db.createItem('secrets', { ...data, teamId, scope }, { teamId, name: data.name })
  }

  editSecret(id, data) {
    return this.db.updateItem('secrets', data, { id })
  }

  deleteSecret(id) {
    this.db.deleteItem('secrets', { id })
  }

  getSecret(id) {
    return this.db.getItem('secrets', { id })
  }

  getSecrets(teamId, scope = 'global') {
    return this.db.getCollection('secrets', { teamId, scope })
  }

  async createPullSecret(teamId: string, name: string, server: string, password: string, username = '_json_key') {
    const client = this.getApiClient()
    const namespace = `team-${teamId}`
    // create data structure for secret
    const data = {
      auths: {
        [server]: {
          username,
          password,
          email: 'not@val.id',
          auth: username + Buffer.from(password).toString('base64'),
        },
      },
    }
    // create the secret
    const secret = {
      ...new k8s.V1Secret(),
      metadata: { ...new k8s.V1ObjectMeta(), name },
      type: 'docker-registry',
      data: {
        '.dockerconfigjson': Buffer.from(JSON.stringify(data)).toString('base64'),
      },
    }
    // eslint-disable-next-line no-useless-catch
    try {
      await client.createNamespacedSecret(namespace, secret)
    } catch (e) {
      throw new AlreadyExists(`Secret '${name}' already exists in namespace '${namespace}'`)
    }
    // get service account we want to add the secret to as pull secret
    const saRes = await client.readNamespacedServiceAccount('default', namespace)
    const { body: sa }: { body: k8s.V1ServiceAccount } = saRes
    // add to service account if needed
    if (!sa.imagePullSecrets) sa.imagePullSecrets = []
    const idx = findIndex(sa.imagePullSecrets, { name })
    if (idx === -1) {
      sa.imagePullSecrets.push({ name })
      await client.patchNamespacedServiceAccount('default', namespace, sa, undefined, undefined, undefined, undefined, {
        headers: { 'content-type': 'application/strategic-merge-patch+json' },
      })
    }
  }

  async getPullSecrets(teamId) {
    const client = this.getApiClient()
    const namespace = `team-${teamId}`
    const saRes = await client.readNamespacedServiceAccount('default', namespace)
    const { body: sa }: { body: k8s.V1ServiceAccount } = saRes
    return sa.imagePullSecrets || []
  }

  async deletePullSecret(teamId, name) {
    const client = this.getApiClient()
    const namespace = `team-${teamId}`
    const saRes = await client.readNamespacedServiceAccount('default', namespace)
    const { body: sa }: { body: k8s.V1ServiceAccount } = saRes
    const idx = findIndex(sa.imagePullSecrets, { name })
    if (idx > -1) {
      sa.imagePullSecrets.splice(idx, 1)
      await client.patchNamespacedServiceAccount('default', namespace, sa, undefined, undefined, undefined, undefined, {
        headers: { 'content-type': 'application/strategic-merge-patch+json' },
      })
    }
    try {
      await client.deleteNamespacedSecret(name, namespace)
    } catch (e) {
      throw new NotExistError(`Secret '${name}' does not exist in namespace '${namespace}'`)
    }
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
    const teams = get(values, 'teamConfig.teams', null)
    if (!teams) {
      console.info(`Missing 'teamConfig.teams' key in ${path} file. Skipping`)
      return
    }
    this.loadTeamsValues(values.teamConfig.teams, cluster)
  }

  loadAllTeamValues(clusters) {
    console.log('loadAllTeamValues')
    const loaded = []
    forEach(clusters, (cluster) => {
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
    forIn(cs, (cloudObj, cloud) => {
      const dnsZones = [cloudObj.domain].concat(get(cloudObj, 'dnsZones', []))
      forIn(cloudObj.clusters, (clusterObject, cluster) => {
        const clusterObj = {
          cloud,
          cluster,
          dnsZones,
          domain: `${cluster}.${cloudObj.domain}`,
          k8sVersion: clusterObject.k8sVersion,
          hasKnative: clusterObject.hasKnative !== undefined ? clusterObject.hasKnative : true,
          region: clusterObject.region,
        }
        console.log(clusterObj)
        const id = `${cloud}/${cluster}`
        this.db.populateItem('clusters', clusterObj, undefined, id)
      })
    })
  }

  loadTeamsValues(teams, cluster) {
    // console.debug(teams)
    forIn(teams, (teamData, teamId) => {
      // console.log(`${teamId}:${teamData}`)
      this.convertTeamToDb(teamData, teamId, cluster)
    })
  }

  static assignCluster(obj, cluster) {
    const clusters = get(obj, 'clusters', [])
    clusters.push(cluster.id)
    set(obj, 'clusters', clusters)
  }

  convertTeamToDb(teamData, teamId, cluster) {
    let team
    try {
      team = this.getTeam(teamId)
      OtomiStack.assignCluster(team, cluster)
      this.editTeam(teamId, team)
    } catch (e) {
      const rawTeam = omit(teamData, 'services')
      OtomiStack.assignCluster(rawTeam, cluster)
      this.db.populateItem('teams', { ...rawTeam, ...glbl.teamConfig.teams[teamId] }, undefined, teamId)
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
    const svc = omit(svcRaw, 'ksvc', 'isPublic', 'hasCert', 'domain', 'path', 'forwardPath')
    svc.clusterId = cluster.id
    svc.teamId = teamId
    if (!('name' in svcRaw)) {
      console.warn('Unknown service structure')
    }
    if ('ksvc' in svcRaw) {
      if ('predeployed' in svcRaw.ksvc) {
        set(svc, 'ksvc.serviceType', 'ksvcPredeployed')
      } else {
        svc.ksvc = cloneDeep(svcRaw.ksvc)
        svc.ksvc.serviceType = 'ksvc'
        const annotations = get(svcRaw.ksvc, 'annotations', {})
        svc.ksvc.annotations = objectToArray(annotations, 'name', 'value')
      }
    } else set(svc, 'ksvc.serviceType', 'svcPredeployed')

    if (!('internal' in svcRaw)) {
      const publicUrl = getPublicUrl(svcRaw.domain, svcRaw.name, teamId, cluster)
      svc.ingress = {
        hasCert: 'hasCert' in svcRaw,
        hasSingleSignOn: !('isPublic' in svcRaw),
        certArn: svcRaw.certArn,
        domain: publicUrl.domain,
        subdomain: publicUrl.subdomain,
        path: svcRaw.path,
        forwardPath: 'forwardPath' in svcRaw,
      }
    }

    const res: any = this.db.populateItem('services', svc, undefined, svc.id)
    console.log(`Loaded service: name: ${res.name}, id: ${res.id}`)
  }

  saveValues() {
    const clusters = this.getClusters()
    forEach(clusters, (cluster) => {
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
    const newValues = omitBy({ ...values, ...glbl }, isUndefined)
    this.repo.writeFile(path, newValues)
  }

  static inCluster(obj, cluster) {
    const clusters = get(obj, 'clusters', [])
    return indexOf(clusters, cluster.id) !== -1
  }

  convertTeamsToValues(cluster) {
    const teams = {}
    this.getTeams().forEach((team) => {
      if (!OtomiStack.inCluster(team, cluster)) return

      const teamCloned = omit(team, ['clusters', 'name'])
      const id = team.id
      teams[id] = teamCloned
      const dbServices = this.getTeamServices(id)
      const services = []

      dbServices.forEach((svc) => {
        if (cluster.id !== svc.clusterId) return

        const serviceType = svc.ksvc.serviceType
        console.info(`Saving service: serviceId: ${svc.serviceId} serviceType: ${serviceType}`)
        const svcCloned = omit(svc, ['teamId', 'clusterId', 'ksvc', 'ingress', 'internal', 'path'])
        const ksvc = cloneDeep(svc.ksvc)
        if (serviceType === 'ksvc') {
          svcCloned.ksvc = ksvc
          delete svcCloned.ksvc.serviceType
          const annotations = get(svc.ksvc, 'annotations', [])
          svcCloned.ksvc.annotations = arrayToObject(annotations, 'name', 'value')
        } else if (serviceType === 'ksvcPredeployed') {
          svcCloned.ksvc = { predeployed: true }
        } else if (serviceType !== 'svcPredeployed') {
          console.warn(`Saving service failure: Not supported service type: ${serviceType}`)
        }
        if (svc.ingress && !isEmpty(svc.ingress)) {
          svcCloned.domain = `${svc.ingress.subdomain}.${svc.ingress.domain}`

          if (!svc.ingress.hasSingleSignOn) svcCloned.isPublic = true

          if (svc.ingress.hasCert) svcCloned.hasCert = true
          if (svc.ingress.certArn) svcCloned.certArn = svc.ingress.certArn
          if (svc.ingress.path) svcCloned.path = svc.ingress.path
          if (svc.ingress.forwardPath) svcCloned.forwardPath = true
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
