/* eslint-disable class-methods-use-this */
import * as k8s from '@kubernetes/client-node'
import { readFileSync } from 'fs'
import yaml from 'js-yaml'
import { cloneDeep, merge, filter, get, omit, set, unset, union, isEmpty } from 'lodash'
import generatePassword from 'password-generator'
import { V1ObjectReference } from '@kubernetes/client-node'
import Debug from 'debug'
import Db from './db'
import {
  Cluster,
  Core,
  Dns,
  Job,
  Policies,
  Secret,
  Service,
  Session,
  Setting,
  Settings,
  Team,
  TeamSelfService,
  User,
} from './otomi-models'
import { HttpError, PublicUrlExists, ValidationError } from './error'
import {
  argQuoteJoin,
  argQuoteStrip,
  argSplit,
  arrayToObject,
  decryptedFilePostfix,
  getObjectPaths,
  getServiceUrl,
  getTeamJobsFilePath,
  getTeamJobsJsonPath,
  getTeamSecretsFilePath,
  getTeamSecretsJsonPath,
  getTeamServicesFilePath,
  getTeamServicesJsonPath,
  objectToArray,
} from './utils'
import cloneRepo, { processValues, Repo } from './repo'
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
  DISABLE_PROCESSING,
  DISABLE_SYNC,
} from './validators'

const debug = Debug('otomi:otomi-stack')

const secretTransferProps = ['type', 'ca', 'crt', 'key', 'entries', 'dockerconfig']

const env = cleanEnv({
  CORE_VERSION,
  GIT_REPO_URL,
  GIT_LOCAL_PATH,
  GIT_BRANCH,
  GIT_USER,
  GIT_PASSWORD,
  GIT_EMAIL,
  DB_PATH,
  DISABLE_PROCESSING,
  DISABLE_SYNC,
})

export default class OtomiStack {
  private coreValues: Core

  db: Db

  repo: Repo

  secretPaths: string[]

  constructor() {
    this.db = new Db(env.DB_PATH)
    const corePath = env.isProd ? '/etc/otomi/core.yaml' : './test/core.yaml'
    this.coreValues = yaml.safeLoad(readFileSync(corePath, 'utf8')) as any
  }

  async init(): Promise<void> {
    for (;;) {
      try {
        /* eslint-disable no-await-in-loop */
        this.repo = await cloneRepo(
          env.GIT_LOCAL_PATH,
          env.GIT_REPO_URL,
          env.GIT_USER,
          env.GIT_EMAIL,
          env.GIT_PASSWORD,
          env.GIT_BRANCH,
        )
        if (this.repo.fileExists('env/cluster.yaml')) break
        debug(`Values are not present at ${env.GIT_REPO_URL}:${env.GIT_BRANCH}`)
      } catch (e) {
        console.error(`${e.message.trim()} for command ${JSON.stringify(e.task?.commands)}`)
        debug(`Git repository is not ready: ${env.GIT_REPO_URL}:${env.GIT_BRANCH}`)
      }
      const timeoutMs = 15000
      debug(`Trying again in ${timeoutMs} ms`)
      await new Promise((resolve) => setTimeout(resolve, timeoutMs))
    }

    this.loadValues()
  }

  getSetting(key: string): Setting {
    return this.db.db.get(['settings', key]).value()
  }

  getAllSettings(): Settings {
    return this.db.db.get('settings').value()
  }

  setSetting(data: Setting) {
    const settings = this.db.db.get('settings').value()
    const ret = this.db.db.set('settings', { ...settings, ...data }).write()
    this.db.dirty = true
    return ret
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

  getTeamJobs(teamId: string): Array<Job> {
    const ids = { teamId }
    return this.db.getCollection('jobs', ids) as Array<Job>
  }

  getAllServices(): Array<Service> {
    return this.db.getCollection('services', (s) => s.teamId !== 'admin') as Array<Service>
  }

  createService(teamId: string, data: Service): Service {
    return this.db.createItem('services', { ...data, teamId }) as Service
  }

  getService(id: string): Service {
    return this.db.getItem('services', { id }) as Service
  }

  editService(id: string, data: Service): Service {
    // check public url in use when new data is given and ingress is not of type cluster
    this.checkPublicUrlInUse(data)
    const oldData = this.getService(id)

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

  getAllJobs(): Array<Job> {
    return this.db.getCollection('jobs') as Array<Job>
  }

  createJob(teamId: string, data: Job): Job {
    return this.db.createItem('jobs', { ...data, teamId }) as Job
  }

  getJob(id: string): Job {
    return this.db.getItem('jobs', { id }) as Job
  }

  editJob(id: string, data: any): Job {
    const oldData = this.getJob(id)
    if (data.name !== oldData.name) {
      this.deleteJob(id)
      // eslint-disable-next-line no-param-reassign
      delete data.id
      return this.createJob(oldData.teamId!, data)
    }
    return this.db.updateItem('jobs', data, { id }) as Job
  }

  deleteJob(id: string): void {
    return this.db.deleteItem('jobs', { id })
  }

  checkPublicUrlInUse(data: any): void {
    // skip when editing or when svc is of type "cluster" as it has no url
    if (data.id || data?.ingress?.type === 'cluster') return
    const newSvc = data.ingress
    const services = this.db.getCollection('services')

    const servicesFiltered = filter(services, (svc: any) => {
      if (svc.ingress?.type !== 'cluster') {
        const { domain, subdomain, path } = svc.ingress
        const existingUrl = `${subdomain}.${domain}${path || ''}`
        const url = `${newSvc.subdomain}.${newSvc.domain}${newSvc.path || ''}`
        return existingUrl === url
      }
      return false
    })
    if (servicesFiltered.length > 0) throw new PublicUrlExists()
  }

  async triggerDeployment(email: string): Promise<void> {
    debug('DISABLE_SYNC: ', env.DISABLE_SYNC)
    debug('DISABLE_PROCESSING: ', env.DISABLE_PROCESSING)
    this.saveValues()
    try {
      if (!env.DISABLE_PROCESSING) await processValues()
    } catch (e) {
      debug(e)
      if (e.response) {
        const { status } = e.response
        if (status === 422) throw new ValidationError()
        throw HttpError.fromCode(status)
      }
      throw new HttpError(500, e)
    }

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
    const clusterData = this.getSetting('cluster') as Cluster
    const cluster = {
      name: clusterData.apiName,
      server: clusterData.apiServer,
      skipTLSVerify: true,
    }

    const user = {
      name: `${namespace}-${clusterData.apiName}`,
      token,
    }

    const context = {
      name: `${namespace}-${clusterData.apiName}`,
      namespace,
      user: user.name,
      cluster: cluster.name,
    }
    const options = {
      users: [user],
      clusters: [cluster],
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

  loadValues(skipAdmin = false): void {
    this.loadCluster()
    this.loadPolicies()
    this.loadSettings()
    this.loadTeams(skipAdmin)
    this.db.setDirtyActive()
  }

  loadCluster(): void {
    const data: Cluster = this.repo.readFile('./env/cluster.yaml')
    // @ts-ignore
    this.db.db.get('settings').assign(data).write()
  }

  loadConfig(dataPath: string, secretDataPath: string): any {
    const data = this.repo.readFile(dataPath)
    let secretData = {}
    if (this.repo.fileExists(secretDataPath)) {
      secretData = this.repo.readFile(secretDataPath)
      this.secretPaths = union(this.secretPaths, getObjectPaths(secretData))
    }
    return merge(data, secretData) as Core
  }

  saveConfig(dataPath: string, secretDataPath: string, config: any, inSecretPaths?: string[]): void {
    const secretData = {}
    const plainData = cloneDeep(config)
    const secretPaths = inSecretPaths ?? (this.secretPaths || [])
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

  loadPolicies(): void {
    const data: Policies = this.repo.readFile('./env/policies.yaml')
    // @ts-ignore
    this.db.db.get('settings').assign(data).write()
  }

  loadSettings(): void {
    const data: Settings = this.loadConfig(
      './env/settings.yaml',
      `./env/secrets.settings.yaml${decryptedFilePostfix()}`,
    )
    // @ts-ignore
    this.db.db.get('settings').assign(data).write()
  }

  loadTeamJobs(teamId: string): void {
    const relativePath = getTeamJobsFilePath(teamId)
    if (!this.repo.fileExists(relativePath)) {
      debug(`Team ${teamId} has no jobs yet`)
      return
    }
    const data = this.repo.readFile(relativePath)
    const jobs: Array<Job> = get(data, getTeamJobsJsonPath(teamId), [])

    jobs.forEach((job) => {
      // @ts-ignore
      const res: Job = this.db.populateItem('jobs', { ...job, teamId }, { teamId, name: job.name }, job.id)
      debug(`Loaded job: name: ${res.name}, id: ${res.id}, teamId: ${teamId}`)
    })
  }

  loadTeamSecrets(teamId: string): void {
    const relativePath = getTeamSecretsFilePath(teamId)
    if (!this.repo.fileExists(relativePath)) {
      debug(`Team ${teamId} has no secrets yet`)
      return
    }
    const data = this.repo.readFile(relativePath)
    const secrets: Array<Secret> = get(data, getTeamSecretsJsonPath(teamId), [])

    secrets.forEach((inSecret) => {
      this.loadSecret(inSecret, teamId)
    })
  }

  loadTeams(skipAdmin = false): void {
    const mergedData: Core = this.loadConfig('./env/teams.yaml', `./env/secrets.teams.yaml${decryptedFilePostfix()}`)

    Object.values(mergedData?.teamConfig?.teams || {}).forEach((team: Team) => {
      this.loadTeam(team)
      if (!skipAdmin) this.loadCoreServices()
      this.loadTeamJobs(team.id!)
      this.loadTeamServices(team.id!)
      this.loadTeamSecrets(team.id!)
    })
  }

  loadCoreServices(): void {
    const { services } = this.coreValues
    services.forEach((svc) => {
      this.loadService(svc, 'admin')
    })
  }

  loadTeamServices(teamId: string): void {
    const relativePath = getTeamServicesFilePath(teamId)
    if (!this.repo.fileExists(relativePath)) {
      debug(`Team ${teamId} has no services yet`)
      return
    }
    const data = this.repo.readFile(relativePath)
    const services = get(data, getTeamServicesJsonPath(teamId), [])
    services.forEach((svc) => {
      this.loadService(svc, teamId)
    })
  }

  saveCluster(): void {
    this.repo.writeFile('./env/cluster.yaml', { cluster: this.getSetting('cluster') })
  }

  savePolicies(): void {
    this.repo.writeFile('./env/policies.yaml', { policies: this.getSetting('policies') })
  }

  saveSettings(): void {
    const settings = this.getAllSettings()
    this.saveConfig(
      './env/settings.yaml',
      `./env/secrets.settings.yaml${decryptedFilePostfix()}`,
      omit(settings, ['cluster', 'policies']),
    )
  }

  saveTeams(): void {
    const filePath = './env/teams.yaml'
    const secretFilePath = `./env/secrets.teams.yaml${decryptedFilePostfix()}`
    const teamValues = {}
    const secretPropertyPaths = [
      'password',
      'azureMonitor.appInsightsApiKey',
      'azureMonitor.clientSecret',
      'azureMonitor.logAnalyticsClientSecret',
      'alerts.slack.url',
      'alerts.msteams',
    ]
    const secretPaths: string[] = []
    const teams = this.getTeams()
    teams.forEach((inTeam) => {
      const team: any = omit(inTeam, 'name')
      this.saveTeamJobs(team.id!)
      this.saveTeamServices(team.id!)
      this.saveTeamSecrets(team.id!)
      if (isEmpty(team.password)) {
        debug(`creating password for team '${team.id}'`)
        team.password = generatePassword(16, false)
      } else debug(`already found a password for team '${team.id}'`)

      team.resourceQuota = arrayToObject(team.resourceQuota ?? [])

      secretPropertyPaths.forEach((propertyPath) => {
        secretPaths.push(`teamConfig.teams.${team.id}.${propertyPath}`)
      })
      teamValues[team.id!] = team
    })
    const values = set({}, 'teamConfig.teams', teamValues)
    this.saveConfig(filePath, secretFilePath, values, secretPaths)
  }

  saveTeamSecrets(teamId: string): void {
    const secrets = this.db.getCollection('secrets', { teamId })
    const values: any[] = secrets.map((secret) => this.convertDbSecretToValues(secret))
    this.repo.writeFile(getTeamSecretsFilePath(teamId), set({}, getTeamSecretsJsonPath(teamId), values))
  }

  saveTeamJobs(teamId: string): void {
    const jobs = this.db.getCollection('jobs', { teamId })
    const jobsRaw = jobs.map((item) => omit(item, ['teamId']))
    const data = {}
    set(data, getTeamJobsJsonPath(teamId), jobsRaw)
    const filePath = getTeamJobsFilePath(teamId)
    this.repo.writeFile(filePath, data)
  }

  saveTeamServices(teamId: string): void {
    const services = this.db.getCollection('services', { teamId })
    const data = {}
    const values: any[] = []
    services.forEach((service) => {
      const value = this.convertDbServiceToValues(service)
      values.push(value)
    })

    set(data, getTeamServicesJsonPath(teamId), values)
    const filePath = getTeamServicesFilePath(teamId)
    this.repo.writeFile(filePath, data)
  }

  loadTeam(inTeam): any {
    const team = { ...inTeam }
    team.resourceQuota = objectToArray(inTeam.resourceQuota)
    const res: any = this.db.populateItem('teams', { ...team, name: team.id! }, undefined, team.id)
    debug(`Loaded team: ${res.name}, id: ${res.id}`)
  }

  loadSecret(inSecret, teamId): void {
    const secret: any = omit(inSecret, ...secretTransferProps)
    secret.teamId = teamId
    secret.secret = secretTransferProps.reduce((memo: any, prop) => {
      if (inSecret[prop] !== undefined) memo[prop] = inSecret[prop]
      return memo
    }, {})
    const res: any = this.db.populateItem('secrets', secret, { teamId, name: secret.name }, secret.id)
    debug(`Loaded secret: name: ${res.name}, id: ${res.id}, teamId: ${teamId}`)
  }

  convertDbSecretToValues(inSecret: any): any {
    const secret: any = omit(inSecret, 'secret')
    secretTransferProps.forEach((prop) => {
      if (inSecret.secret[prop] !== undefined) secret[prop] = inSecret.secret[prop]
    })
    return secret
  }

  loadService(svcRaw, teamId): void {
    // Create service
    const svc = omit(svcRaw, 'domain', 'forwardPath', 'hasCert', 'auth', 'ksvc', 'paths', 'type', 'ownHost', 'tlsPass')
    svc.teamId = teamId
    if (!('name' in svcRaw)) {
      debug('Unknown service structure')
    }
    if ('ksvc' in svcRaw) {
      if ('predeployed' in svcRaw.ksvc) {
        set(svc, 'ksvc.serviceType', 'ksvcPredeployed')
      } else {
        svc.ksvc = cloneDeep(svcRaw.ksvc)
        svc.ksvc.serviceType = 'ksvc'
        svc.ksvc.annotations = objectToArray(svcRaw.ksvc.annotations)
        svc.ksvc.env = objectToArray(svcRaw.ksvc.env, 'name', 'value')
        svc.ksvc.files = objectToArray(svcRaw.ksvc.files, 'path', 'content')
        svc.ksvc.secretMounts = objectToArray(svcRaw.ksvc.secretMounts, 'name', 'path')
        svc.ksvc.secrets = svcRaw.ksvc.secrets ?? []
        if (svcRaw.ksvc.command?.length) svc.ksvc.command = argQuoteJoin(svcRaw.ksvc.command)
        if (svcRaw.ksvc.args?.length) svc.ksvc.args = argQuoteJoin(svcRaw.ksvc.args)
      }
    } else set(svc, 'ksvc.serviceType', 'svcPredeployed')

    if (svcRaw.type === 'cluster') {
      svc.ingress = { type: 'cluster' }
    } else {
      const dns: Dns = this.getSetting('dns') as Dns
      const cluster: Cluster = this.getSetting('cluster') as Cluster
      const url = getServiceUrl({ domain: svcRaw.domain, name: svcRaw.name, teamId, cluster, dns })
      svc.ingress = {
        hasCert: 'hasCert' in svcRaw,
        auth: 'auth' in svcRaw,
        certArn: svcRaw.certArn || undefined,
        domain: url.domain,
        subdomain: url.subdomain,
        useDefaultSubdomain: !svcRaw.domain && svcRaw.ownHost,
        path: svcRaw.paths && svcRaw.paths.length ? svcRaw.paths[0] : undefined,
        forwardPath: 'forwardPath' in svcRaw,
        tlsPass: 'tlsPass' in svcRaw,
        type: svcRaw.type,
      }
    }

    const res: any = this.db.populateItem('services', svc, undefined, svc.id)
    debug(`Loaded service: name: ${res.name}, id: ${res.id}`)
  }

  // eslint-disable-next-line class-methods-use-this
  convertDbServiceToValues(svc: any): any {
    const { serviceType } = svc.ksvc
    debug(`Saving service: id: ${svc.id} serviceType: ${serviceType}`)
    const svcCloned = omit(svc, ['teamId', 'ksvc', 'ingress', 'path'])
    const ksvc = cloneDeep(svc.ksvc)
    delete ksvc.serviceType
    if (serviceType === 'ksvc') {
      svcCloned.ksvc = ksvc
      svcCloned.ksvc.annotations = arrayToObject(svc.ksvc.annotations!)
      svcCloned.ksvc.env = arrayToObject(svc.ksvc.env ?? [])
      svcCloned.ksvc.files = arrayToObject(svc.ksvc.files ?? [], 'path', 'content')
      svcCloned.ksvc.secretMounts = arrayToObject(svc.ksvc.secretMounts ?? [], 'name', 'path')
      svcCloned.ksvc.command = svc.ksvc.command?.length > 1 ? svc.ksvc.command.split(' ') : svc.ksvc.command
      // conveniently split the command string (which might contain args as well) by space
      svcCloned.ksvc.command =
        svc.ksvc.command?.length > 1 ? svc.ksvc.command.match(argSplit).map(argQuoteStrip) : svc.ksvc.command
      // same for args
      svcCloned.ksvc.args = svc.ksvc.args?.length > 1 ? svc.ksvc.args.match(argSplit).map(argQuoteStrip) : svc.ksvc.args
    } else if (serviceType === 'ksvcPredeployed') {
      svcCloned.ksvc = { predeployed: true }
    } else if (serviceType !== 'svcPredeployed') {
      debug(`Saving service failure: Not supported service type: ${serviceType}`)
    }
    if (svc.ingress && svc.ingress.type !== 'cluster') {
      const ing = svc.ingress
      if (ing.useDefaultSubdomain) svcCloned.ownHost = true
      else svcCloned.domain = `${ing.subdomain}.${ing.domain}`
      if (ing.auth) svcCloned.auth = true
      if (ing.hasCert) svcCloned.hasCert = true
      if (ing.certArn) svcCloned.certArn = ing.certArn
      if (ing.path) svcCloned.paths = [ing.path]
      if (ing.forwardPath) svcCloned.forwardPath = true
      if (ing.tlsPass) svcCloned.tlsPass = true
      svcCloned.type = svc.ingress.type
    } else svcCloned.type = 'cluster'
    return svcCloned
  }

  saveValues(): void {
    // TODO: saveApps()
    this.saveCluster()
    this.savePolicies()
    this.saveSettings()
    this.saveTeams()
  }

  getSession(user: User): Session {
    const data: Session = {
      cluster: this.getSetting('cluster') as Session['cluster'],
      clusters: get(this.getSetting('otomi'), 'additionalClusters', []) as Session['clusters'],
      core: this.getCore(),
      dns: this.getSetting('dns') as Session['dns'],
      user,
      teams: this.getTeams(),
      isDirty: this.db.isDirty(),
      versions: {
        core: env.CORE_VERSION,
        api: process.env.npm_package_version,
      },
    }
    return data
  }
}
