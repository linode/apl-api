import * as k8s from '@kubernetes/client-node'
import fs from 'fs'
import yaml from 'js-yaml'
import { findIndex } from 'lodash'
import cloneDeep from 'lodash/cloneDeep'
import merge from 'lodash/merge'
import filter from 'lodash/filter'
import forIn from 'lodash/forIn'
import get from 'lodash/get'
import isEmpty from 'lodash/isEmpty'
import omit from 'lodash/omit'
import set from 'lodash/set'
import unset from 'lodash/unset'
import generatePassword from 'password-generator'
import db, { Db } from './db'
import { AlreadyExists, NotExistError, PublicUrlExists } from './error'
import { arrayToObject, getPublicUrl, getTeamSecretsFilePath, getTeamSecretsJsonPath, objectToArray } from './utils'
import cloneRepo, { Repo } from './repo'
import {
  cleanEnv,
  GIT_REPO_URL,
  GIT_LOCAL_PATH,
  GIT_BRANCH,
  GIT_USER,
  GIT_PASSWORD,
  GIT_EMAIL,
  DB_PATH,
  CLUSTER_NAME,
  CLUSTER_APISERVER,
  DISABLE_SYNC,
  USE_SOPS,
} from './validators'

const env = cleanEnv({
  GIT_REPO_URL,
  GIT_LOCAL_PATH,
  GIT_BRANCH,
  GIT_USER,
  GIT_PASSWORD,
  GIT_EMAIL,
  DB_PATH,
  CLUSTER_NAME,
  CLUSTER_APISERVER,
  DISABLE_SYNC,
  USE_SOPS,
})

function saveConfig(repo: Repo, dataPath: string, secretDataPath: string, config, objectPathsForSecrets: string[]) {
  const secretData = {}
  const plainData = cloneDeep(config)

  objectPathsForSecrets.forEach((objectPath) => {
    const val = get(config, objectPath)
    if (val) {
      set(secretData, objectPath, val)
      unset(plainData, objectPath)
    }
  })

  repo.writeFile(secretDataPath, secretData)
  repo.writeFile(dataPath, plainData)
}

export default class OtomiStack {
  clustersPath: string

  private coreValues: any

  db: Db

  repo: Repo
  decryptedFilePostfix: string

  constructor() {
    this.db = db(env.DB_PATH)
    this.clustersPath = './env/clusters.yaml'
    const corePath = env.isProd ? '/etc/otomi/core.yaml' : './test/core.yaml'
    this.coreValues = yaml.safeLoad(fs.readFileSync(corePath, 'utf8'))
    this.decryptedFilePostfix = env.USE_SOPS ? '.dec' : ''
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
      this.loadValues()
    } catch (e) {
      console.error('Unable to init app', e)
      return false
    }
    return true
  }

  // ANCHOR: Settings
  getSettings() {
    return this.db.getCollection('settings')
  }

  loadSettings() {
    const data = this.repo.readFile('./env/settings.yaml')
    console.log(data)
  }

  saveSettings() {
    console.log('some setting')
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
    const id = data.name
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

  async triggerDeployment(email: string) {
    console.log('DISABLE_SYNC: ', env.DISABLE_SYNC)
    this.saveValues()

    if (!env.DISABLE_SYNC) {
      await this.repo.save(email)
    }
    this.db.dirty = false
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

  createSecret(teamId, data) {
    return this.db.createItem('secrets', { ...data, teamId }, { teamId, name: data.name })
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

  getAllSecrets() {
    return this.db.getCollection('secrets', {})
  }

  getSecrets(teamId) {
    return this.db.getCollection('secrets', { teamId })
  }

  async createPullSecret({
    teamId,
    name,
    server,
    password,
    username = '_json_key',
  }: {
    teamId: string
    name: string
    server: string
    password: string
    username?: string
  }) {
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

  // ANCHOR: Load objects from repo
  loadValues() {
    this.loadClusters()
    this.loadSettings()
    this.loadTeams()
    this.db.setDirtyActive()
  }

  loadConfig(dataPath, secretDataPath): any {
    const data = this.repo.readFile(dataPath)
    const secretData = this.repo.readFile(secretDataPath)
    return merge(data, secretData)
  }

  loadTeamSecrets(teamId, clusterId) {
    try {
      const data = this.repo.readFile(getTeamSecretsFilePath(teamId, clusterId))
      const secrets: [any] = get(data, getTeamSecretsJsonPath(teamId), [])

      secrets.forEach((secret) => {
        const res = this.db.populateItem(
          'secrets',
          { ...secret, teamId, clusterId },
          { clusterId, teamId, name: secret.name },
          secret.id,
        )
        console.log(`Loaded secret: name: ${res.name}, id: ${res.id}, teamId: ${teamId}, clusterId: ${clusterId}`)
      })
    } catch (e) {
      console.warn(`Team ${teamId} has no secrets yet`)
    }
  }

  loadClusters() {
    const data = this.repo.readFile('./env/clusters.yaml')
    this.convertClusterValuesToDb(data)
  }

  loadTeams() {
    const mergedData = this.loadConfig('./env/teams.yaml', `./env/secrets.teams.yaml${this.decryptedFilePostfix}`)

    Object.values(mergedData.teamConfig.teams).forEach((team: any) => {
      this.db.populateItem('teams', { name: team.id, ...team }, undefined, team.id)
      team.clusters.forEach((clusterId) => {
        this.loadTeamServices(team.id, clusterId)
        this.loadTeamSecrets(team.id, clusterId)
      })
    })
  }

  loadTeamServices(teamId, clusterId) {
    // e.g.: ./env/clouds/google/dev/services.chai.yaml
    const filePath = `./env/clouds/${clusterId}/services.${teamId}.yaml`
    try {
      const data = this.repo.readFile(filePath)
      const services = get(data, `teamConfig.teams.${teamId}.services`, [])
      const cluster = this.db.getItem('clusters', { id: clusterId })
      services.forEach((svc) => {
        this.convertServiceToDb(svc, teamId, cluster)
      })
    } catch (e) {
      console.warn(`Team ${teamId} has no services on cluster ${clusterId}`)
    }
  }

  // ANCHOR: Save objects into repo
  saveTeams() {
    const filePath = './env/teams.yaml'
    const secretFilePath = `./env/secrets.teams.yaml${this.decryptedFilePostfix}`
    const teamValues = {}
    const secretPropertyPaths = [
      'password',
      'oidc.groupMapping',
      'azureMonitor',
      'alerts.slack',
      'alerts.email',
      'alerts.msteams',
    ]
    const objectPaths = []
    const teams = this.getTeams()
    teams.forEach((team) => {
      team.clusters.forEach((clusterId) => {
        this.saveTeamServices(team.id, clusterId)
        this.saveTeamSecrets(team.id, clusterId)
      })
      if (!team.password) team.password = generatePassword(16, false)
      teamValues[team.id] = omit(team, 'name')

      secretPropertyPaths.forEach((propertyPath) => {
        objectPaths.push(`teamConfig.teams.${team.id}.${propertyPath}`)
      })
    })

    const values = {}
    set(values, 'teamConfig.teams', teamValues)

    saveConfig(this.repo, filePath, secretFilePath, values, objectPaths)
  }

  saveTeamSecrets(teamId: string, clusterId: string) {
    let secrets = this.db.getCollection('secrets', { teamId, clusterId })
    secrets = secrets.map((item) => omit(item, ['teamId', 'clusterId']))
    const data = {}
    set(data, getTeamSecretsJsonPath(teamId), secrets)
    this.repo.writeFile(getTeamSecretsFilePath(teamId, clusterId), data)
  }

  saveTeamServices(teamId, clusterId) {
    const services = this.db.getCollection('services', { teamId, clusterId })
    const data = {}
    const values = []
    services.forEach((service) => {
      const value = this.convertDbServiceToValues(service)
      values.push(value)
    })

    set(data, `teamConfig.teams.${teamId}.services`, values)
    const filePath = `./env/clouds/${clusterId}/services.${teamId}.yaml`
    this.repo.writeFile(filePath, data)
  }

  // ANCHOR: Convert objects from and to formats supported by either db or repo
  convertDbServiceToValues(svc) {
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
      if (svc.ingress.useDefaultSubdomain) svcCloned.ownHost = true
      else svcCloned.domain = `${svc.ingress.subdomain}.${svc.ingress.domain}`

      if (!svc.ingress.hasSingleSignOn) svcCloned.isPublic = true

      if (svc.ingress.hasCert) svcCloned.hasCert = true
      if (svc.ingress.certArn) svcCloned.certArn = svc.ingress.certArn
      if (svc.ingress.path) svcCloned.paths = [svc.ingress.path]
      if (svc.ingress.forwardPath) svcCloned.forwardPath = true
    } else svcCloned.internal = true
    delete svcCloned.enabled
    return svcCloned
  }

  convertClusterValuesToDb(values) {
    const cs = values.clouds
    forIn(cs, (cloudObj, cloud) => {
      forIn(cloudObj.clusters, (clusterObject, cluster) => {
        const domain = `${cluster}.${cloudObj.domain}`
        const dnsZones = [cloudObj.domain].concat(get(cloudObj, 'dnsZones', []))

        const clusterObj = {
          enabled: clusterObject.enabled === undefined ? true : clusterObject.enabled,
          cloud,
          name: cluster,
          dnsZones,
          domain,
          otomiVersion: clusterObject.otomiVersion,
          k8sVersion: clusterObject.k8sVersion,
          hasKnative: clusterObject.hasKnative !== undefined ? clusterObject.hasKnative : true,
          region: clusterObject.region,
        }
        const id = `${cloud}/${cluster}`
        this.db.populateItem('clusters', clusterObj, undefined, id)
      })
    })
  }

  convertServiceToDb(svcRaw, teamId, cluster) {
    // Create service
    const svc = omit(svcRaw, 'ksvc', 'isPublic', 'hasCert', 'domain', 'paths', 'forwardPath')
    svc.enabled = !!cluster.enabled
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
        certArn: svcRaw.certArn || undefined,
        domain: publicUrl.domain,
        subdomain: publicUrl.subdomain,
        useDefaultSubdomain: !svcRaw.domain && svcRaw.ownHost,
        path: svcRaw.paths && svcRaw.paths.length ? svcRaw.paths[0] : undefined,
        forwardPath: 'forwardPath' in svcRaw,
      }
    }

    const res: any = this.db.populateItem('services', svc, undefined, svc.id)
    console.log(`Loaded service: name: ${res.name}, id: ${res.id}`)
  }

  saveValues() {
    this.saveSettings()
    this.saveTeams()
  }
}
