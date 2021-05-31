import * as k8s from '@kubernetes/client-node'
import fs from 'fs'
import yaml from 'js-yaml'
import { cloneDeep, merge, filter, get, isEmpty, omit, set, unset, isEqual, union } from 'lodash'
import generatePassword from 'password-generator'
import { V1ObjectReference } from '@kubernetes/client-node'
import Db from './db'
import { Cluster, Core, Dns, Secret, Service, Session, Settings, Team, TeamSelfService, User } from './otomi-models'
import { PublicUrlExists } from './error'
import {
  arrayToObject,
  getObjectPaths,
  getPublicUrl,
  getTeamSecretsFilePath,
  getTeamSecretsJsonPath,
  objectToArray,
} from './utils'
import cloneRepo, { Repo } from './repo'
import {
  cleanEnv,
  CORE_VERSION,
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

import pkg from '../package.json'

const env = cleanEnv({
  CORE_VERSION,
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

function convertDbServiceToValues(svc: any): any {
  const { serviceType } = svc.ksvc
  console.info(`Saving service: id: ${svc.id} serviceType: ${serviceType}`)
  const svcCloned = omit(svc, ['teamId', 'ksvc', 'ingress', 'internal', 'path'])
  const ksvc = cloneDeep(svc.ksvc)
  if (serviceType === 'ksvc') {
    svcCloned.ksvc = ksvc
    delete svcCloned?.ksvc?.serviceType
    const annotations = get(svc.ksvc, 'annotations', [])
    svcCloned.ksvc.annotations = arrayToObject(annotations, 'name', 'value')
  } else if (serviceType === 'ksvcPredeployed') {
    svcCloned.ksvc = { predeployed: true }
  } else if (serviceType !== 'svcPredeployed') {
    console.warn(`Saving service failure: Not supported service type: ${serviceType}`)
  }
  if (svc.ingress.public) {
    if (svc.ingress.public.useDefaultSubdomain) svcCloned.ownHost = true
    else svcCloned.domain = `${svc.ingress.public.subdomain}.${svc.ingress.public.domain}`

    if (!svc.ingress.public.hasSingleSignOn) svcCloned.isPublic = true

    if (svc.ingress.public.hasCert) svcCloned.hasCert = true
    if (svc.ingress.public.certArn) svcCloned.certArn = svc.ingress.public.certArn
    if (svc.ingress.public.path) svcCloned.paths = [svc.ingress.public.path]
    if (svc.ingress.public.forwardPath) svcCloned.forwardPath = true
  } else svcCloned.internal = true
  delete svcCloned.enabled
  return svcCloned
}

export default class OtomiStack {
  private coreValues: any

  db: Db

  repo: Repo

  decryptedFilePostfix: string

  secretPaths: string[]

  constructor() {
    this.db = new Db(env.DB_PATH)
    const corePath = env.isProd ? '/etc/otomi/core.yaml' : './test/core.yaml'
    this.coreValues = yaml.safeLoad(fs.readFileSync(corePath, 'utf8')) as any
    this.decryptedFilePostfix = env.USE_SOPS ? '.dec' : ''
  }

  async init(): Promise<void> {
    this.repo = await cloneRepo(
      env.GIT_LOCAL_PATH,
      env.GIT_REPO_URL,
      env.GIT_USER,
      env.GIT_EMAIL,
      env.GIT_PASSWORD,
      env.GIT_BRANCH,
    )
    this.loadValues()
  }

  getSettings(): Settings {
    return this.db.db.get('settings').value() as Settings
  }

  editSettings(data: Settings): Settings {
    this.db.db.set('settings', data).write()
    return this.db.db.get('settings').value() as Settings
  }

  getTeams(): Array<Team> {
    return this.db.getCollection('teams') as Array<Team>
  }

  getTeamSelfServiceFlags(id: string): TeamSelfService {
    const data = this.getTeam(id)
    return data.selfService
  }

  getCore(): any {
    return this.coreValues
  }

  getTeam(id: string): Team {
    return this.db.getItem('teams', { id }) as Team
  }

  createTeam(data: Team): Team {
    const id = data.name
    return this.db.createItem('teams', data, { id }, id) as Team
  }

  editTeam(id: string, data: Team): Team {
    return this.db.updateItem('teams', data, { id }) as Team
  }

  deleteTeam(id: string): void {
    try {
      this.db.deleteItem('services', { id })
    } catch (e) {
      // no services found
    }
    this.db.deleteItem('teams', { id })
  }

  getTeamServices(teamId: string): Array<Service> {
    const ids = { teamId }
    return this.db.getCollection('services', ids) as Array<Service>
  }

  getCluster(): Cluster {
    return this.db.getCollection('cluster')[0] as Cluster
  }

  getAllServices(): Array<Service> {
    return this.db.getCollection('services') as Array<Service>
  }

  createService(teamId: string, data: Service): Service {
    this.checkPublicUrlInUse(data)
    return this.db.createItem('services', { ...data, teamId }) as Service
  }

  getService(id: string): Service {
    return this.db.getItem('services', { id }) as Service
  }

  editService(id: string, data: any): Service {
    const oldData = this.getService(id) as any
    if (data.ingress) {
      const { domain, subdomain, path } = data.ingress
      const oldi = oldData.ingress
      if (!isEqual({ domain, subdomain, path }, { domain: oldi.domain, subdomain: oldi.subdomain, path: oldi.path }))
        this.checkPublicUrlInUse(data)
    }

    if (data.name !== oldData.name) {
      this.deleteService(id)
      // eslint-disable-next-line no-param-reassign
      delete data.id
      return this.createService(oldData.teamId!, data)
    }
    return this.db.updateItem('services', data, { id }) as Service
  }

  deleteService(id: string): void {
    return this.db.deleteItem('services', { id })
  }

  checkPublicUrlInUse(data: Service): void {
    if (isEmpty(data.ingress)) return

    const services = this.db.getCollection('services')

    const servicesFiltered = filter(services, (svc: Service) => {
      // @ts-ignore
      const ingressPublic = svc.ingress.public
      if (!ingressPublic) return false
      const { domain, subdomain, path } = ingressPublic
      const existingUrl = `${subdomain}.${domain}${path || ''}`
      const url = `${ingressPublic.subdomain}.${ingressPublic.domain}${ingressPublic.path || ''}`
      return existingUrl === url && svc.id !== data.id
    })

    if (servicesFiltered.length !== 0) throw new PublicUrlExists()
  }

  async triggerDeployment(email: string): Promise<void> {
    console.log('DISABLE_SYNC: ', env.DISABLE_SYNC)
    this.saveValues()

    if (!env.DISABLE_SYNC) {
      await this.repo.save(email)
    }
    this.db.dirty = false
  }

  apiClient?: k8s.CoreV1Api

  getApiClient(): k8s.CoreV1Api {
    if (this.apiClient) return this.apiClient
    const kc = new k8s.KubeConfig()
    kc.loadFromDefault()
    this.apiClient = kc.makeApiClient(k8s.CoreV1Api)
    return this.apiClient
  }

  // eslint-disable-next-line class-methods-use-this
  async getKubecfg(teamId: string): Promise<k8s.KubeConfig> {
    const client = this.getApiClient()
    const namespace = `team-${teamId}`
    const saRes = await client.readNamespacedServiceAccount('default', namespace)
    const { body: sa }: { body: k8s.V1ServiceAccount } = saRes
    const { secrets }: { secrets?: Array<V1ObjectReference> } = sa
    const secretName = secrets?.length ? secrets[0].name : ''
    const secretRes = await client.readNamespacedSecret(secretName || '', namespace)
    const { body: secret }: { body: k8s.V1Secret } = secretRes
    const token = Buffer.from(secret.data?.token || '', 'base64').toString('ascii')
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
      users: [user],
      contexts: [context],
      currentContext: context.name,
    }
    const config = new k8s.KubeConfig()
    config.loadFromOptions(options)
    return config
  }

  createSecret(teamId, data): Secret {
    return this.db.createItem('secrets', { ...data, teamId }, { teamId, name: data.name }) as Secret
  }

  editSecret(id: string, data: Secret): Secret {
    return this.db.updateItem('secrets', data, { id }) as Secret
  }

  deleteSecret(id: string): void {
    this.db.deleteItem('secrets', { id })
  }

  getSecret(id: string): Secret {
    return this.db.getItem('secrets', { id }) as Secret
  }

  getAllSecrets(): Array<Secret> {
    return this.db.getCollection('secrets', {}) as Array<Secret>
  }

  getSecrets(teamId: string): Array<Secret> {
    return this.db.getCollection('secrets', { teamId }) as Array<Secret>
  }

  loadValues(): void {
    this.loadCluster()
    this.loadSettings()
    this.loadTeams()
    this.db.setDirtyActive()
  }

  loadCluster(): void {
    const data: any = this.repo.readFile('./env/cluster.yaml')
    const { cluster } = data
    this.db.populateItem('cluster', cluster, undefined, cluster.id)
  }

  loadConfig(dataPath: string, secretDataPath: string): any {
    const data = this.repo.readFile(dataPath)
    const secretData = this.repo.readFile(secretDataPath)
    this.secretPaths = union(this.secretPaths, getObjectPaths(secretData))
    return merge(data, secretData) as Core
  }

  saveConfig(dataPath: string, secretDataPath: string, config: any, inSecretPaths?: string[]): void {
    const secretData = {}
    const plainData = cloneDeep(config)
    const secretPaths = inSecretPaths ?? this.secretPaths
    secretPaths.forEach((objectPath) => {
      const val = get(config, objectPath)
      if (val) {
        set(secretData, objectPath, val)
        unset(plainData, objectPath)
      }
    })

    this.repo.writeFile(secretDataPath, secretData)
    this.repo.writeFile(dataPath, plainData)
  }

  loadSettings(): void {
    const data = this.loadConfig(
      './env/settings.yaml',
      `./env/secrets.settings.yaml${this.decryptedFilePostfix}`,
    ) as Settings
    // eslint-disable-next-line chai-friendly/no-unused-expressions
    data.dns!.zones = union(data.dns!.zones, [data.dns!.domain])
    this.db.db.set('settings', data).write()
  }

  loadTeamSecrets(teamId: string): void {
    const relativePath = getTeamSecretsFilePath(teamId)
    if (!this.repo.fileExists(relativePath)) {
      console.warn(`Team ${teamId} has no secrets yet`)
      return
    }
    const data = this.repo.readFile(relativePath)
    const secrets: Array<Secret> = get(data, getTeamSecretsJsonPath(teamId), [])

    secrets.forEach((secret) => {
      // @ts-ignore
      const res: Secret = this.db.populateItem(
        'secrets',
        { ...secret, teamId },
        { teamId, name: secret.name },
        secret.id,
      )
      console.log(`Loaded secret: name: ${res.name}, id: ${res.id}, teamId: ${teamId}`)
    })
  }

  loadTeams(): void {
    const mergedData: Core = this.loadConfig('./env/teams.yaml', `./env/secrets.teams.yaml${this.decryptedFilePostfix}`)

    Object.values(mergedData.teamConfig.teams).forEach((team: Team) => {
      this.db.populateItem('teams', { ...team, name: team.id! }, undefined, team.id)
      this.loadTeamServices(team.id!)
      this.loadTeamSecrets(team.id!)
    })
  }

  loadTeamServices(teamId: string): void {
    const relativePath = `./env/teams/services.${teamId}.yaml`
    if (!this.repo.fileExists(relativePath)) {
      console.warn(`Team ${teamId} has no services yet`)
      return
    }
    const data = this.repo.readFile(relativePath)
    const services = get(data, `teamConfig.teams.${teamId}.services`, [])
    const { dns } = this.getSettings()
    services.forEach((svc) => {
      this.convertServiceToDb(svc, teamId, dns)
    })
  }

  saveSettings(): void {
    const settings: Settings = this.getSettings()
    this.saveConfig('./env/settings.yaml', `./env/secrets.settings.yaml${this.decryptedFilePostfix}`, settings)
  }

  saveTeams(): void {
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
    const secretPaths: string[] = []
    const teams = this.getTeams()
    teams.forEach((team) => {
      // TODO: fix this ugly team.id || ''
      this.saveTeamServices(team.id || '')
      this.saveTeamSecrets(team.id || '')
      // eslint-disable-next-line no-param-reassign
      if (!team.password) team.password = generatePassword(16, false)
      teamValues[team.id || ''] = omit(team, 'name')

      secretPropertyPaths.forEach((propertyPath) => {
        secretPaths.push(`teamConfig.teams.${team.id}.${propertyPath}`)
      })
    })

    const values = {}
    set(values, 'teamConfig.teams', teamValues)

    this.saveConfig(filePath, secretFilePath, values, secretPaths)
  }

  saveTeamSecrets(teamId: string): void {
    const secrets = this.db.getCollection('secrets', { teamId })
    const secretsRaw = secrets.map((item) => omit(item, ['teamId']))
    const data = {}
    set(data, getTeamSecretsJsonPath(teamId), secretsRaw)
    this.repo.writeFile(getTeamSecretsFilePath(teamId), data)
  }

  saveTeamServices(teamId: string): void {
    const services = this.db.getCollection('services', { teamId })
    const data = {}
    const values: any[] = []
    services.forEach((service) => {
      const value = convertDbServiceToValues(service)
      values.push(value)
    })

    set(data, `teamConfig.teams.${teamId}.services`, values)
    const filePath = `./env/teams/services.${teamId}.yaml`
    this.repo.writeFile(filePath, data)
  }

  convertServiceToDb(svcRaw, teamId, dns: Dns): void {
    // Create service
    const svc = omit(svcRaw, 'ksvc', 'isPublic', 'hasCert', 'domain', 'paths', 'forwardPath')
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
        svc.ksvc.secrets = svcRaw.ksvc.secrets ?? []
      }
    } else set(svc, 'ksvc.serviceType', 'svcPredeployed')

    if ('internal' in svcRaw) {
      svc.ingress = {}
    } else {
      const publicUrl = getPublicUrl(svcRaw.domain, svcRaw.name, teamId, dns)
      svc.ingress = {
        public: {
          hasCert: 'hasCert' in svcRaw,
          hasSingleSignOn: !('isPublic' in svcRaw),
          certArn: svcRaw.certArn || undefined,
          domain: publicUrl.domain,
          subdomain: publicUrl.subdomain,
          useDefaultSubdomain: !svcRaw.domain && svcRaw.ownHost,
          path: svcRaw.paths && svcRaw.paths.length ? svcRaw.paths[0] : undefined,
          forwardPath: 'forwardPath' in svcRaw,
        },
      }
    }

    const res: any = this.db.populateItem('services', svc, undefined, svc.id)
    console.log(`Loaded service: name: ${res.name}, id: ${res.id}`)
  }

  saveValues(): void {
    // TODO: saveApps()
    this.saveSettings()
    this.saveTeams()
  }

  getSession(user: User): Session {
    const data = {
      clusters: get(this.getSettings(), 'otomi.additionalClusters', []),
      cluster: this.getCluster(),
      core: this.getCore(),
      dns: this.getSettings().dns,
      user,
      teams: this.getTeams(),
      isDirty: this.db.isDirty(),
      versions: {
        core: env.CORE_VERSION,
        api: pkg.version,
      },
    }
    return data
  }
}
