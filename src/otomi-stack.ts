/* eslint-disable class-methods-use-this */
import * as k8s from '@kubernetes/client-node'
import { V1ObjectReference } from '@kubernetes/client-node'
import axios, { AxiosResponse } from 'axios'
import { pascalCase } from 'change-case'
import Debug from 'debug'
import { emptyDir } from 'fs-extra'
import { readFile } from 'fs/promises'
import { cloneDeep, each, filter, isEmpty, omit, pick, set } from 'lodash'
import generatePassword from 'password-generator'
import { getAppList, getAppSchema, getSpec } from 'src/app'
import Db from 'src/db'
import { DeployLockError, HttpError, PublicUrlExists, ValidationError } from 'src/error'
import { cleanAllSessions, cleanSession, DbMessage, getIo, getSessionStack } from 'src/middleware'
import {
  App,
  Core,
  Job,
  Secret,
  Service,
  Session,
  Settings,
  Team,
  TeamSelfService,
  User,
  Values,
} from 'src/otomi-models'
import getRepo, { Repo } from 'src/repo'
import {
  argQuoteJoin,
  argQuoteStrip,
  argSplit,
  arrayToObject,
  getServiceUrl,
  objectToArray,
  removeBlankAttributes,
} from 'src/utils'
import {
  cleanEnv,
  CUSTOM_ROOT_CA,
  EDITOR_INACTIVITY_TIMEOUT,
  GIT_BRANCH,
  GIT_EMAIL,
  GIT_LOCAL_PATH,
  GIT_PASSWORD,
  GIT_REPO_URL,
  GIT_USER,
  TOOLS_HOST,
  VERSIONS,
} from 'src/validators'
import { parse as parseYaml } from 'yaml'

const debug = Debug('otomi:otomi-stack')

const secretTransferProps = ['type', 'ca', 'crt', 'key', 'entries', 'dockerconfig']

const env = cleanEnv({
  CUSTOM_ROOT_CA,
  EDITOR_INACTIVITY_TIMEOUT,
  GIT_BRANCH,
  GIT_EMAIL,
  GIT_LOCAL_PATH,
  GIT_PASSWORD,
  GIT_REPO_URL,
  GIT_USER,
  TOOLS_HOST,
  VERSIONS,
})

export function getTeamJobsFilePath(teamId: string): string {
  return `env/teams/jobs.${teamId}.yaml`
}

export function getTeamJobsJsonPath(teamId: string): string {
  return `teamConfig.${teamId}.jobs`
}

export function getTeamSecretsFilePath(teamId: string): string {
  return `env/teams/external-secrets.${teamId}.yaml`
}

export function getTeamSecretsJsonPath(teamId: string): string {
  return `teamConfig.${teamId}.secrets`
}

export function getTeamServicesFilePath(teamId: string): string {
  return `env/teams/services.${teamId}.yaml`
}

export function getTeamServicesJsonPath(teamId: string): string {
  return `teamConfig.${teamId}.services`
}

export const rootPath = '/tmp/otomi/values'

const baseUrl = `http://${env.TOOLS_HOST}:17771/`
const readUrl = `${baseUrl}read`
const updateUrl = `${baseUrl}update`

const ownModels = ['apps', 'secrets', 'services', 'shortcuts']
export default class OtomiStack {
  private core: Core
  values: Values
  db: Db
  editor?: string
  locked = false
  isLoaded = false
  repo: Repo

  constructor(editor?: string, inDb?: Db) {
    this.editor = editor
    this.db = inDb ?? new Db()
  }

  getAppList() {
    let apps = getAppList()
    apps = apps.filter((item) => item !== 'ingress-nginx')
    const { ingress } = this.getSettings()
    const allClasses = ['platform'].concat(ingress?.classes?.map((obj) => obj.className as string) || [])
    const ingressApps = allClasses.map((name) => `ingress-nginx-${name}`)
    return apps.concat(ingressApps)
  }

  getRepoPath() {
    if (env.isTest || this.editor === undefined) return env.GIT_LOCAL_PATH
    const folder = `${rootPath}/${this.editor}`
    return folder
  }

  async readValues(): Promise<AxiosResponse> {
    debug(`Tools: requesting "read" on values repo path ${this.repo.path}`)
    const res = await axios.get(readUrl, { params: { envDir: this.repo.path } })
    this.values = res.data
    return res
  }

  async updateValues(values: Values): Promise<void> {
    debug(`Tools: requesting "update" on values repo path ${this.repo.path}`)
    await axios.post(updateUrl, values, { params: { envDir: this.repo.path } })
    this.values = values
  }

  async init(): Promise<void> {
    if (env.isProd) {
      const corePath = '/etc/otomi/core.yaml'
      this.core = parseYaml(await readFile(corePath, 'utf8')) as Core
    } else {
      this.core = {
        ...parseYaml(await readFile('./test/core.yaml', 'utf8')),
        ...parseYaml(await readFile('./test/apps.yaml', 'utf8')),
      }
    }
  }

  async initRepo(skipDbInflation = false): Promise<void> {
    await this.init()
    // every editor gets their own folder to detect conflicts upon deploy
    const path = this.getRepoPath()
    const branch = env.GIT_BRANCH
    const url = env.GIT_REPO_URL
    for (;;) {
      try {
        this.repo = await getRepo(path, url, env.GIT_USER, env.GIT_EMAIL, env.GIT_PASSWORD, branch)
        await this.repo.pull()
        if (await this.repo.fileExists('env/cluster.yaml')) break
        debug(`Values are not present at ${url}:${branch}`)
      } catch (e) {
        debug(`${e.message.trim()} for command ${JSON.stringify(e.task?.commands)}`)
        debug(`Git repository is not ready: ${url}:${branch}`)
      }
      const timeoutMs = 10000
      debug(`Trying again in ${timeoutMs} ms`)
      await new Promise((resolve) => setTimeout(resolve, timeoutMs))
    }
    // branches get a copy of the "main" branch db, so we don't need to inflate
    if (!skipDbInflation) await this.loadValues()
  }

  async pull(skipMsg = false): Promise<void> {
    await this.repo.pull()
    if (!skipMsg) {
      const msg: DbMessage = { editor: 'system', state: 'corrupt', reason: 'conflict' }
      getIo().emit('db', msg)
    }
  }

  getSettings(keys?: string[]): Settings {
    const settings = this.db.db.get(['settings']).value()
    if (!keys) return settings
    return pick(settings, keys) as Settings
  }

  editSettings(data: Settings, settingId: string) {
    const settings = this.db.db.get('settings').value()
    // do not merge as oneOf properties cannot be merged
    // settings[settingId] = merge(settings[settingId], data[settingId])
    settings[settingId] = removeBlankAttributes(data[settingId] as Record<string, any>)
    this.db.db.set('settings', settings).write()
    return settings
  }

  getApp(teamId: string, id: string): App {
    // @ts-ignore
    const app = this.db.getItem('apps', { teamId, id }) as App
    if (teamId === 'admin') return app
    const adminApp = this.db.getItem('apps', { teamId: 'admin', id: app.id }) as App
    return { ...cloneDeep(app), enabled: adminApp.enabled }
  }

  getApps(teamId, picks?: string[]): Array<App> {
    const apps = this.db.getCollection('apps', { teamId }) as Array<App>
    if (teamId === 'admin') return apps
    // map apps enabled to the one from adminApps
    const mapped = apps.map((a: App) => {
      const adminApp = this.db.getItem('apps', { teamId: 'admin', id: a.id }) as App
      return { ...cloneDeep(a), enabled: adminApp.enabled }
    })
    if (!picks) return mapped
    return pick(mapped, picks) as Array<App>
  }

  editApp(teamId, id, data: App): App {
    // @ts-ignore
    let app: App = this.db.getItem('apps', { teamId, id })
    // Shallow merge, so only first level attributes can be replaced (values, rawValues, shortcuts, etc.)
    app = { ...app, ...data }
    return this.db.updateItem('apps', app as Record<string, any>, { teamId, id }) as App
  }

  canToggleApp(id: string): boolean {
    const { spec } = getSpec()
    const { schemas } = spec.components
    const appName = `App${pascalCase(id)}`
    const app = schemas[appName]
    return app.properties!.enabled !== undefined
  }

  toggleApps(teamId: string, ids: string[], enabled: boolean): void {
    ids.map((id) => {
      // we might be given a dep that is only relevant to core, or
      // which is essential, so skip it
      const orig = this.db.getItemReference('apps', { teamId, id }, false) as App
      if (orig && this.canToggleApp(id)) this.db.updateItem('apps', { enabled }, { teamId, id }, true)
    })
  }

  loadTeamShortcuts(teamId) {
    const {
      teamConfig: {
        [`${teamId}`]: { apps },
      },
    } = this.values
    each(apps, ({ shortcuts }, appId) => {
      // use merge strategy to not overwrite apps that were loaded before
      const item = this.db.getItemReference('apps', { teamId, id: appId }, false)
      if (item) this.db.updateItem('apps', { shortcuts }, { teamId, id: appId }, true)
    })
  }

  loadPlatformApps(): void {
    const apps = this.getAppList()
    apps.map((inAppId) => {
      const appId = inAppId.startsWith('ingress-nginx-') ? 'ingress-nginx' : inAppId
      const values = this.values.apps?.[appId] ?? {}
      let rawValues = {}
      if (values._rawValues) {
        rawValues = values._rawValues
        delete values._rawValues
      }
      let enabled
      const app = getAppSchema(appId)
      if (app.properties!.enabled !== undefined) enabled = !!values.enabled
      // we do not want to send enabled flag to the input forms
      delete values.enabled
      const teamId = 'admin'
      this.db.populateItem('apps', { id: appId, enabled, values, rawValues, teamId })
    })
  }

  getTeams(): Array<Team> {
    return this.db.getCollection('teams') as Array<Team>
  }

  getTeamSelfServiceFlags(id: string): TeamSelfService {
    const data = this.getTeam(id)
    return data.selfService
  }

  getTeam(id: string): Team {
    return this.db.getItem('teams', { id }) as Team
  }

  createTeam(data: Team): Team {
    const id = data.id || data.name

    if (isEmpty(data.password)) {
      debug(`creating password for team '${data.name}'`)
      // eslint-disable-next-line no-param-reassign
      data.password = generatePassword(16, false)
    }
    const team = this.db.createItem('teams', data, { id }) as Team
    this.loadTeamApps(id)
    return team
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
    return this.db.getCollection('services') as Array<Service>
  }

  createService(teamId: string, data: Service): Service {
    this.checkPublicUrlInUse(data)
    try {
      return this.db.createItem('services', { ...data, teamId }, { teamId, name: data.name }) as Service
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Service name already exists'

      throw err
    }
  }

  getService(id: string): Service {
    return this.db.getItem('services', { id }) as Service
  }

  editService(id: string, data: Service): Service {
    this.deleteService(id)
    return this.createService(data.teamId!, { ...data, id })
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

  editJob(id: string, data: Job): Job {
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
        const { domain, subdomain, paths } = svc.ingress
        const _baseUrl = `${subdomain}.${domain}`
        const newBaseUrl = `${newSvc.subdomain}.${newSvc.domain}`
        // no paths for existing or new service? then just check base url
        if (!newSvc.paths?.length && !paths?.length) return _baseUrl === newBaseUrl
        // one has paths but other doesn't? no problem
        if ((newSvc.paths?.length && !paths?.length) || (!newSvc.paths?.length && paths?.length)) return false
        // both have paths, so check full
        return paths.some((p) => {
          const existingUrl = `${subdomain}.${domain}${p}`
          const newUrls: string[] = newSvc.paths.map((_p: string) => `${newSvc.subdomain}.${newSvc.domain}${_p}`)
          return newUrls.includes(existingUrl)
        })
      }
      return false
    })
    if (servicesFiltered.length > 0) throw new PublicUrlExists()
  }

  async save(editor: string): Promise<void> {
    // save values first
    const values = this.convertDbToValues()
    try {
      await this.updateValues(values)
    } catch (e) {
      debug(`ERROR: ${JSON.stringify(e)}`)
      if (e.response) {
        const { status } = e.response as AxiosResponse
        if (status === 422) throw new ValidationError()
        throw HttpError.fromCode(status)
      }
      throw new HttpError(500, `${e}`)
    }
    // all good? commit
    await this.repo.commit(editor)
    // we are in a developer branch so first merge in root which might be changed by another dev
    await this.repo.pull()
    // pushing to the root (not the remote!), so should not throw unless race condition with another dev
    await this.repo.push()
  }

  async doDeployment(): Promise<void> {
    const rootStack = await getSessionStack()
    if (rootStack.locked) throw new DeployLockError()
    rootStack.locked = true
    try {
      await this.save(this.editor!)
      // pull push root
      await rootStack.repo.pull()
      await rootStack.repo.push()
      // inflate new db
      rootStack.db = new Db()
      await rootStack.loadValues()
      // and remove editor from the session
      await cleanSession(this.editor!, false)
      const sha = await rootStack.repo.getCommitSha()
      const msg: DbMessage = { state: 'clean', editor: this.editor!, sha, reason: 'deploy' }
      getIo().emit('db', msg)
    } catch (e) {
      const msg: DbMessage = { editor: 'system', state: 'corrupt', reason: 'deploy' }
      getIo().emit('db', msg)
      throw e
    } finally {
      rootStack.locked = false
    }
  }

  async doRevert(): Promise<void> {
    // other sessions active, can't do full reload
    // remove editor from the session
    await cleanSession(this.editor!)
  }

  async doRestore(): Promise<void> {
    cleanAllSessions()
    await emptyDir(rootPath)
    // and re-init root
    const rootStack = await getSessionStack()
    await rootStack.initRepo()
    // and msg
    const msg: DbMessage = { state: 'clean', editor: 'system', sha: rootStack.repo.commitSha, reason: 'restore' }
    getIo().emit('db', msg)
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
    this.getTeam(teamId) // will throw if not existing
    const {
      cluster: { name, apiName = `otomi-${name}`, apiServer },
    } = this.getSettings(['cluster']) as Record<string, any>
    if (!apiServer) throw new ValidationError('Missing configuration value: cluster.apiServer')
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
      name: apiName,
      server: apiServer,
      skipTLSVerify: true,
    }

    const user = {
      name: `${namespace}-${apiName}`,
      token,
    }

    const context = {
      name: `${namespace}-${apiName}`,
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

  createSecret(teamId: string, data: Record<string, any>): Secret {
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

  async loadValues(): Promise<void> {
    debug('Loading values')
    await this.readValues()
    this.inflateValues()
  }

  inflateValues(): void {
    debug('Inflating values')
    this.loadSettings()
    this.loadPlatformApps()
    each(this.values?.teamConfig, (team: Team, teamId: string) => {
      this.loadTeam(team)
      // platform apps were assigned to teamId 'admin' alerady in loadPlatformApps, so skip
      if (teamId !== 'admin') this.loadTeamApps(teamId)
      this.loadTeamJobs(teamId)
      this.loadTeamServices(teamId)
      this.loadTeamSecrets(teamId)
      this.loadTeamShortcuts(teamId)
    })
    this.isLoaded = true
  }

  loadSettings(): void {
    const data = pick(this.values, [
      'alerts',
      'azure',
      'backup',
      'cloud',
      'cluster',
      'dns',
      'home',
      'ingress',
      'kms',
      'oidc',
      'otomi',
      'policies',
      'smtp',
      'version',
    ])
    data.otomi!.nodeSelector = objectToArray((data.otomi!.nodeSelector ?? {}) as Record<string, any>)
    // @ts-ignore
    this.db.db.get('settings').assign(data).write()
  }

  loadTeam(inTeam: Team): void {
    const team = { ...omit(inTeam, ownModels), name: inTeam.id } as Record<string, any>
    team.resourceQuota = objectToArray(inTeam.resourceQuota as Record<string, any>)
    this.db.populateItem('teams', team)
    debug(`Loaded team ${inTeam.id}`)
  }

  loadTeamApps(teamId): void {
    const apps = getAppList()
    apps.forEach((appId) => {
      const isShared = !!this.core.adminApps.find((a) => a.name === appId)!.isShared
      const inTeamApps = !!this.core.teamApps.find((a) => a.name === appId)
      if (teamId === 'admin' || isShared || inTeamApps) {
        this.db.populateItem('apps', { shortcuts: [], teamId, id: appId })
        debug(`Loaded team app ${appId}, teamId:  ${teamId}`)
      }
    })
  }

  loadTeamJobs(teamId: string): void {
    const jobs = this.values.teamConfig[teamId].jobs ?? []
    jobs.forEach((job) => {
      // @ts-ignore
      this.db.populateItem('jobs', { ...job, teamId, name: job.name })
      debug(`Loaded job ${job.name}, id: ${job.id}, teamId: ${teamId}`)
    })
  }

  loadTeamSecrets(teamId: string): void {
    const secrets = this.values.teamConfig[teamId].secrets ?? []
    secrets.forEach((inSecret) => {
      const secret: Record<string, any> = omit(inSecret, ...secretTransferProps)
      secret.teamId = teamId
      secret.secret = secretTransferProps.reduce((memo: any, prop) => {
        if (inSecret[prop] !== undefined) memo[prop] = inSecret[prop]
        return memo
      }, {})
      this.db.populateItem('secrets', secret)
      debug(`Loaded secret: name: ${secret.name}, id: ${secret.id}, teamId: ${teamId}`)
    })
  }

  loadTeamServices(teamId: string): void {
    const services = this.values.teamConfig[teamId].services ?? []
    services.forEach((svcRaw: Record<string, any>) => {
      const svc = omit(
        svcRaw,
        'certArn',
        'certName',
        'domain',
        'forwardPath',
        'hasCert',
        'ksvc',
        'paths',
        'type',
        'ownHost',
        'tlsPass',
        'ingressClassName',
        'headers',
      )
      svc.teamId = teamId
      if (!('name' in svcRaw)) debug('Unknown service structure')

      if ('ksvc' in svcRaw) {
        if ('predeployed' in svcRaw.ksvc) set(svc, 'ksvc.serviceType', 'ksvcPredeployed')
        else {
          svc.ksvc = cloneDeep(svcRaw.ksvc) as Record<string, any>
          svc.ksvc.serviceType = 'ksvc'
          svc.ksvc.annotations = objectToArray(svcRaw.ksvc.annotations as Record<string, any>)
          svc.ksvc.env = objectToArray(svcRaw.ksvc.env as Record<string, any>, 'name', 'value')
          svc.ksvc.files = objectToArray(svcRaw.ksvc.files as Record<string, any>, 'path', 'content')
          svc.ksvc.secretMounts = objectToArray(svcRaw.ksvc.secretMounts as Record<string, any>, 'name', 'path')
          svc.ksvc.secrets = svcRaw.ksvc.secrets ?? []
          if (svcRaw.ksvc.command?.length) svc.ksvc.command = argQuoteJoin(svcRaw.ksvc.command)
          if (svcRaw.ksvc.args?.length) svc.ksvc.args = argQuoteJoin(svcRaw.ksvc.args)
        }
      } else set(svc, 'ksvc.serviceType', 'svcPredeployed')

      if (svcRaw.type === 'cluster') svc.ingress = { type: 'cluster' }
      else {
        const { cluster, dns } = this.getSettings(['cluster', 'dns'])
        const url = getServiceUrl({ domain: svcRaw.domain, name: svcRaw.name, teamId, cluster, dns })
        svc.ingress = {
          certArn: svcRaw.certArn || undefined,
          certName: svcRaw.certName || undefined,
          domain: url.domain,
          headers: svcRaw.headers || [],
          forwardPath: 'forwardPath' in svcRaw,
          hasCert: 'hasCert' in svcRaw,
          paths: svcRaw.paths ? svcRaw.paths : [],
          subdomain: url.subdomain,
          tlsPass: 'tlsPass' in svcRaw,
          type: svcRaw.type,
          useDefaultSubdomain: !svcRaw.domain && svcRaw.ownHost,
          ingressClassName: svcRaw.ingressClassName || undefined,
        }
      }

      this.db.populateItem('services', removeBlankAttributes(svc))
      debug(`Loaded service: name: ${svc.name}, id: ${svc.id}`)
    })
  }

  convertPlatformAppsToValues(): Record<string, any> {
    const apps = {}
    this.getApps('admin').map((app) => {
      const { id, enabled, values, rawValues } = app
      apps[id] = {
        ...(values || {}),
        _rawValues: rawValues,
      }
      if (this.canToggleApp(id)) apps[id].enabled = !!enabled
      else delete apps[id].enabled
    })
    return apps
  }

  convertTeamAppsToValues(teamId: string): Record<string, any> {
    const apps = {}
    this.getApps(teamId).forEach((app) => {
      const { id, shortcuts } = app
      if (teamId !== 'admin' && !shortcuts?.length) return
      apps[id] = {
        shortcuts: shortcuts ?? [],
      }
    })
    return apps
  }

  convertSettingsToValues(): Settings {
    const settings = cloneDeep(this.getSettings()) as Record<string, Record<string, any>>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    set(settings, 'otomi.nodeSelector', arrayToObject(settings.otomi?.nodeSelector || []))
    return settings
  }

  convertTeamsToValues(): Record<string, any> {
    const teamConfig = {}
    const teams = this.getTeams()
    teams.map((inTeam) => {
      const team: Record<string, any> = omit(inTeam, 'name')
      const teamId = team.id as string
      team.apps = this.convertTeamAppsToValues(teamId)
      team.jobs = this.convertTeamJobsToValues(teamId)
      team.services = this.convertTeamServicesToValues(teamId)
      team.secrets = this.convertTeamSecretsToValues(teamId)
      team.resourceQuota = arrayToObject((team.resourceQuota as []) ?? [])
      teamConfig[teamId] = team
    })
    return teamConfig
  }

  convertTeamSecretsToValues(teamId: string): Record<string, any>[] {
    const secrets = this.db.getCollection('secrets', { teamId }) as Secret[]
    const values: any[] = secrets.map((s) => {
      const secret: any = omit(s, 'secret')
      secretTransferProps.forEach((prop) => {
        if (s.secret[prop] !== undefined) secret[prop] = s.secret[prop]
      })
      return secret
    })
    return values
  }

  convertTeamJobsToValues(teamId: string): Record<string, any>[] {
    const jobs = this.db.getCollection('jobs', { teamId }) as Job[]
    return jobs.map((item) => omit(item, ['teamId']))
  }

  convertTeamServicesToValues(teamId: string): Record<string, any>[] {
    const services = this.db.getCollection('services', { teamId }) as any[]
    const values: any[] = []
    services.forEach((svc) => {
      const { serviceType } = svc.ksvc
      debug(`Saving service: id: ${svc.id} serviceType: ${serviceType}`)
      const svcCloned = omit(svc, ['teamId', 'ksvc', 'ingress', 'path'])
      const ksvc = cloneDeep(svc.ksvc)
      delete ksvc.serviceType
      if (serviceType === 'ksvc') {
        svcCloned.ksvc = ksvc as Record<string, any>
        svcCloned.ksvc.annotations = arrayToObject(svc.ksvc.annotations as [])
        svcCloned.ksvc.env = arrayToObject((svc.ksvc.env as []) ?? [])
        svcCloned.ksvc.files = arrayToObject((svc.ksvc.files as []) ?? [], 'path', 'content')
        svcCloned.ksvc.secretMounts = arrayToObject((svc.ksvc.secretMounts as []) ?? [], 'name', 'path')
        svcCloned.ksvc.command = svc.ksvc.command?.length > 1 ? svc.ksvc.command.split(' ') : svc.ksvc.command
        // conveniently split the command string (which might contain args as well) by space
        svcCloned.ksvc.command =
          svc.ksvc.command?.length > 1 ? svc.ksvc.command.match(argSplit).map(argQuoteStrip) : svc.ksvc.command
        // same for args
        svcCloned.ksvc.args =
          svc.ksvc.args?.length > 1 ? svc.ksvc.args.match(argSplit).map(argQuoteStrip) : svc.ksvc.args
      } else if (serviceType === 'ksvcPredeployed') svcCloned.ksvc = { predeployed: true }
      else if (serviceType !== 'svcPredeployed')
        debug(`Saving service failure: Not supported service type: ${serviceType}`)

      if (svc.ingress && svc.ingress.type !== 'cluster') {
        const ing = svc.ingress
        if (ing.useDefaultSubdomain) svcCloned.ownHost = true
        else svcCloned.domain = ing.subdomain ? `${ing.subdomain}.${ing.domain}` : ing.domain
        if (ing.hasCert) svcCloned.hasCert = true
        if (ing.certName) svcCloned.certName = ing.certName
        if (ing.certArn) svcCloned.certArn = ing.certArn
        if (ing.paths) svcCloned.paths = ing.paths
        if (ing.forwardPath) svcCloned.forwardPath = true
        if (ing.tlsPass) svcCloned.tlsPass = true
        if (ing.ingressClassName) svcCloned.ingressClassName = ing.ingressClassName
        if (ing.headers) svcCloned.headers = ing.headers
        svcCloned.type = svc.ingress.type
      } else svcCloned.type = 'cluster'

      values.push(svcCloned)
    })
    return values
  }

  convertDbToValues(): Values {
    return {
      ...this.values,
      ...this.convertSettingsToValues(),
      apps: this.convertPlatformAppsToValues(),
      teamConfig: this.convertTeamsToValues(),
    }
  }

  async getSession(user: k8s.User): Promise<Session> {
    const rootStack = await getSessionStack()
    const currentSha = rootStack.repo.commitSha
    const data: Session = {
      ca: env.CUSTOM_ROOT_CA,
      core: this.core as Record<string, any>,
      corrupt: rootStack.repo.corrupt,
      editor: this.editor,
      inactivityTimeout: env.EDITOR_INACTIVITY_TIMEOUT,
      user: user as User,
      versions: {
        core: env.VERSIONS.core,
        api: env.VERSIONS.api ?? process.env.npm_package_version,
        console: env.VERSIONS.console,
        values: currentSha,
      },
    }
    return data
  }
}
