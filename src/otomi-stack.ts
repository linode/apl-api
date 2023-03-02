/* eslint-disable class-methods-use-this */
import * as k8s from '@kubernetes/client-node'
import { V1ObjectReference } from '@kubernetes/client-node'
import Debug from 'debug'

import { emptyDir } from 'fs-extra'
import { readFile } from 'fs/promises'
import { cloneDeep, each, filter, get, isEmpty, omit, pick, set } from 'lodash'
import generatePassword from 'password-generator'
import { getAppList, getAppSchema, getSpec } from 'src/app'
import Db from 'src/db'
import { DeployLockError, PublicUrlExists, ValidationError } from 'src/error'
import { cleanAllSessions, cleanSession, DbMessage, getIo, getSessionStack } from 'src/middleware'
import {
  App,
  Core,
  Job,
  Policies,
  Secret,
  Service,
  Session,
  Settings,
  Team,
  TeamSelfService,
  User,
  Workload,
  WorkloadValues,
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
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

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

export function getTeamWorkloadsFilePath(teamId: string): string {
  return `env/teams/workloads.${teamId}.yaml`
}
export function getTeamWorkloadValuesFilePath(teamId: string, workloadName): string {
  return `env/teams/workloads/${teamId}/${workloadName}.yaml`
}

export function getTeamWorkloadsJsonPath(teamId: string): string {
  return `teamConfig.${teamId}.workloads`
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

export default class OtomiStack {
  private coreValues: Core

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

  async init(): Promise<void> {
    if (env.isProd) {
      const corePath = '/etc/otomi/core.yaml'
      this.coreValues = parseYaml(await readFile(corePath, 'utf8')) as Core
    } else {
      this.coreValues = {
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
    debug('Values are loaded')
  }

  getSecretPaths(): string[] {
    // we split secrets from plain data, but have to overcome teams using patternproperties
    const teamProp = 'teamConfig.patternProperties.^[a-z0-9]([-a-z0-9]*[a-z0-9])+$'
    const teams = this.getTeams().map(({ id }) => id)
    const cleanSecretPaths: string[] = []
    const { secretPaths } = getSpec()
    secretPaths.map((p) => {
      if (p.indexOf(teamProp) === -1 && !cleanSecretPaths.includes(p)) cleanSecretPaths.push(p)
      else {
        teams.forEach((teamId: string) => {
          if (p.indexOf(teamProp) === 0) cleanSecretPaths.push(p.replace(teamProp, `teamConfig.${teamId}`))
        })
      }
    })
    // debug('secretPaths: ', cleanSecretPaths)
    return cleanSecretPaths
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
    const app = getAppSchema(id)
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

  async loadApp(appInstanceId: string): Promise<void> {
    const appId = appInstanceId.startsWith('ingress-nginx-') ? 'ingress-nginx' : appInstanceId
    const path = `env/apps/${appInstanceId}.yaml`
    const secretsPath = `env/apps/secrets.${appInstanceId}.yaml`
    const content = await this.repo.loadConfig(path, secretsPath)
    const values = (content?.apps && content.apps[appInstanceId]) || {}
    let rawValues = {}

    // eslint-disable-next-line no-underscore-dangle
    if (values._rawValues) {
      // eslint-disable-next-line no-underscore-dangle
      rawValues = values._rawValues
      // eslint-disable-next-line no-underscore-dangle
      delete values._rawValues
    }
    let enabled
    const app = getAppSchema(appId)
    if (app.properties!.enabled !== undefined) enabled = !!values.enabled

    // we do not want to send enabled flag to the input forms
    delete values.enabled
    const teamId = 'admin'
    this.db.createItem('apps', { enabled, values, rawValues, teamId }, { teamId, id: appInstanceId }, appInstanceId)
  }

  async loadTeamShortcuts(teamId): Promise<void> {
    const teamAppsFile = `env/teams/apps.${teamId}.yaml`
    if (!(await this.repo.fileExists(teamAppsFile))) return
    const content = await this.repo.readFile(teamAppsFile)
    if (!content) return
    const {
      teamConfig: {
        [`${teamId}`]: { apps: _apps },
      },
    } = content
    each(_apps, ({ shortcuts }, appId) => {
      // use merge strategy to not overwrite apps that were loaded before
      const item = this.db.getItemReference('apps', { teamId, id: appId }, false)
      if (item) this.db.updateItem('apps', { shortcuts }, { teamId, id: appId }, true)
    })
  }

  async loadApps(): Promise<void> {
    const apps = this.getAppList()
    await Promise.all(
      apps.map(async (appId) => {
        await this.loadApp(appId)
      }),
    )

    // now also load the shortcuts that teams created and were stored in apps.* files
    await Promise.all(
      this.getTeams()
        .map((t) => t.id)
        .map(async (teamId) => {
          await this.loadTeamShortcuts(teamId)
        }),
    )
  }

  getTeams(): Array<Team> {
    return this.db.getCollection('teams') as Array<Team>
  }

  getTeamSelfServiceFlags(id: string): TeamSelfService {
    const data = this.getTeam(id)
    return data.selfService
  }

  getCore(): Core {
    return this.coreValues
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
    const team = this.db.createItem('teams', data, { id }, id) as Team
    const apps = getAppList()
    const core = this.getCore()
    apps.forEach((appId) => {
      const isShared = !!core.adminApps.find((a) => a.name === appId)?.isShared
      const inTeamApps = !!core.teamApps.find((a) => a.name === appId)
      // Admin apps are loaded by loadApps function
      if (id !== 'admin' && (isShared || inTeamApps))
        this.db.createItem('apps', { shortcuts: [] }, { teamId: id, id: appId }, appId)
    })
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

  getTeamWorkloads(teamId: string): Array<Workload> {
    const ids = { teamId }
    return this.db.getCollection('workloads', ids) as Array<Workload>
  }

  getAllWorkloads(): Array<Workload> {
    return this.db.getCollection('workloads') as Array<Workload>
  }

  createWorkload(teamId: string, data: Workload): Workload {
    try {
      const w = this.db.createItem('workloads', { ...data, teamId }, { teamId, name: data.name }) as Workload
      this.db.createItem('workloadValues', { teamId, values: {} }, { teamId, name: w.name }, w.id) as WorkloadValues
      return w
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Workload name already exists'
      throw err
    }
  }
  getWorkload(id: string): Workload {
    return this.db.getItem('workloads', { id }) as Workload
  }

  editWorkload(id: string, data: Workload): Workload {
    return this.db.updateItem('workloads', data, { id }) as Workload
  }

  deleteWorkload(id: string): void {
    return this.db.deleteItem('workloads', { id })
  }

  editWorkloadValues(id: string, data: WorkloadValues): WorkloadValues {
    return this.db.updateItem('workloadValues', data, { id }) as WorkloadValues
  }

  getWorkloadValues(id: string): WorkloadValues {
    return this.db.getItem('workloadValues', { id }) as WorkloadValues
  }

  getAllServices(): Array<Service> {
    return this.db.getCollection('services') as Array<Service>
  }

  createService(teamId: string, data: Service): Service {
    this.checkPublicUrlInUse(data)
    try {
      return this.db.createItem('services', { ...data, teamId }, { teamId, name: data.name }, data?.id) as Service
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
        const baseUrl = `${subdomain}.${domain}`
        const newBaseUrl = `${newSvc.subdomain}.${newSvc.domain}`
        // no paths for existing or new service? then just check base url
        if (!newSvc.paths?.length && !paths?.length) return baseUrl === newBaseUrl
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

  async doDeployment(): Promise<void> {
    const rootStack = await getSessionStack()
    if (rootStack.locked) throw new DeployLockError()
    rootStack.locked = true
    try {
      await this.saveValues()
      await this.repo.save(this.editor!)
      // pull push root
      await rootStack.repo.pull(undefined, true)
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

  async getDockerConfig(teamId: string): Promise<string> {
    this.getTeam(teamId) // will throw if not existing
    const client = this.getApiClient()
    const namespace = `team-${teamId}`
    const secretName = 'harbor-pushsecret'
    const secretRes = await client.readNamespacedSecret(secretName, namespace)
    const { body: secret }: { body: k8s.V1Secret } = secretRes
    const token = Buffer.from(secret.data!['.dockerconfigjson'], 'base64').toString('ascii')
    return token
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

  async loadValues(): Promise<Promise<Promise<Promise<Promise<void>>>>> {
    debug('Loading values')
    await this.loadCluster()
    await this.loadPolicies()
    await this.loadSettings()
    await this.loadTeams()
    await this.loadApps()
    this.isLoaded = true
  }

  async loadCluster(): Promise<void> {
    const data = await this.repo.loadConfig('env/cluster.yaml', 'env/secrets.cluster.yaml')
    // @ts-ignore
    this.db.db.get('settings').assign(data).write()
  }

  async loadPolicies(): Promise<void> {
    const data: Policies = await this.repo.readFile('env/policies.yaml')
    // @ts-ignore
    this.db.db.get('settings').assign(data).write()
  }

  async loadSettings(): Promise<void> {
    const data: Record<string, any> = await this.repo.loadConfig('env/settings.yaml', `env/secrets.settings.yaml`)
    data.otomi!.nodeSelector = objectToArray((data.otomi!.nodeSelector ?? {}) as Record<string, any>)
    // @ts-ignore
    this.db.db.get('settings').assign(data).write()
  }

  async loadTeamJobs(teamId: string): Promise<void> {
    const relativePath = getTeamJobsFilePath(teamId)
    if (!(await this.repo.fileExists(relativePath))) {
      debug(`Team ${teamId} has no jobs yet`)
      return
    }
    const data = await this.repo.readFile(relativePath)
    const jobs: Array<Job> = get(data, getTeamJobsJsonPath(teamId), [])

    jobs.forEach((job) => {
      // @ts-ignore
      const res: Job = this.db.populateItem('jobs', { ...job, teamId }, { teamId, name: job.name }, job.id)
      debug(`Loaded job: name: ${res.name}, id: ${res.id}, teamId: ${teamId}`)
    })
  }

  async loadTeamSecrets(teamId: string): Promise<void> {
    const relativePath = getTeamSecretsFilePath(teamId)
    if (!(await this.repo.fileExists(relativePath))) {
      debug(`Team ${teamId} has no secrets yet`)
      return
    }
    const data = await this.repo.readFile(relativePath)
    const secrets: Array<Secret> = get(data, getTeamSecretsJsonPath(teamId), [])

    secrets.forEach((inSecret) => {
      this.loadSecret(inSecret, teamId)
    })
  }

  async loadTeamWorkloads(teamId: string): Promise<void> {
    const relativePath = getTeamWorkloadsFilePath(teamId)
    if (!(await this.repo.fileExists(relativePath))) {
      debug(`Team ${teamId} has no workloads yet`)
      return
    }
    const data = await this.repo.readFile(relativePath)
    const inData: Array<Workload> = get(data, getTeamWorkloadsJsonPath(teamId), [])
    inData.forEach((inWorkload) => {
      const res: any = this.db.populateItem('workloads', { ...inWorkload, teamId }, undefined, inWorkload.id as string)
      debug(`Loaded workload: name: ${res.name}, id: ${res.id}, teamId: ${res.teamId}`)
    })
    const workloads = this.getTeamWorkloads(teamId)
    await Promise.all(
      workloads.map((workload) => {
        this.loadWorkloadValues(workload)
      }),
    )
  }

  async loadWorkloadValues(workload: Workload): Promise<WorkloadValues> {
    const relativePath = getTeamWorkloadValuesFilePath(workload.teamId!, workload.name)
    let data = { values: {} } as Record<string, any>
    if (!(await this.repo.fileExists(relativePath)))
      debug(`The workload values file does not exists at ${relativePath}`)
    else data = await this.repo.readFile(relativePath)

    data.id = workload.id!
    data.teamId = workload.teamId!
    data.name = workload.name!
    try {
      data.values = parseYaml(data.values as string) || {}
    } catch (error) {
      debug(
        `The values property does not seem to be a YAML formated string at ${relativePath}. Falling back to empty map.`,
      )
      data.values = {}
    }

    const res = this.db.populateItem('workloadValues', data, undefined, workload.id as string) as WorkloadValues
    debug(`Loaded workload values: name: ${res.name} id: ${res.id}, teamId: ${workload.teamId!}`)
    return res
  }

  async loadTeams(): Promise<void> {
    const mergedData: Core = await this.repo.loadConfig('env/teams.yaml', `env/secrets.teams.yaml`)
    const tc = mergedData?.teamConfig || {}
    if (!tc.admin) tc.admin = { id: 'admin' }
    Object.values(tc).forEach((team: Team) => {
      this.loadTeam(team)
      this.loadTeamJobs(team.id!)
      this.loadTeamServices(team.id!)
      this.loadTeamSecrets(team.id!)
      this.loadTeamWorkloads(team.id!)
    })
  }

  async loadTeamServices(teamId: string): Promise<void> {
    const relativePath = getTeamServicesFilePath(teamId)
    if (!(await this.repo.fileExists(relativePath))) {
      debug(`Team ${teamId} has no services yet`)
      return
    }
    const data = await this.repo.readFile(relativePath)
    const services = get(data, getTeamServicesJsonPath(teamId), [])
    services.forEach((svc) => {
      this.loadService(svc, teamId)
    })
  }

  async saveCluster(secretPaths?: string[]): Promise<void> {
    await this.repo.saveConfig(
      'env/cluster.yaml',
      'env/secrets.cluster.yaml',
      this.getSettings(['cluster']),
      secretPaths ?? this.getSecretPaths(),
    )
  }

  async savePolicies(): Promise<void> {
    await this.repo.writeFile('env/policies.yaml', this.getSettings(['policies']))
  }

  async saveAdminApps(secretPaths?: string[]): Promise<void> {
    await Promise.all(
      this.getApps('admin').map(async (app) => {
        const apps = {}
        const { id, enabled, values, rawValues } = app
        apps[id] = {
          ...(values || {}),
        }
        if (!isEmpty(rawValues)) apps[id]._rawValues = rawValues

        if (this.canToggleApp(id)) apps[id].enabled = !!enabled
        else delete apps[id].enabled

        await this.repo.saveConfig(
          `env/apps/${id}.yaml`,
          `env/apps/secrets.${id}.yaml`,
          { apps },
          secretPaths ?? this.getSecretPaths(),
        )
      }),
    )
  }

  async saveTeamApps(teamId: string): Promise<void> {
    const apps = {}
    this.getApps(teamId).forEach((app) => {
      const { id, shortcuts } = app
      if (teamId !== 'admin' && !shortcuts?.length) return
      apps[id] = {
        shortcuts,
      }
    })
    const content = {
      teamConfig: {
        [teamId]: {
          apps,
        },
      },
    }
    await this.repo.writeFile(`env/teams/apps.${teamId}.yaml`, content)
  }

  async saveSettings(secretPaths?: string[]): Promise<void> {
    const settings = cloneDeep(this.getSettings()) as Record<string, Record<string, any>>
    settings.otomi.nodeSelector = arrayToObject(settings.otomi.nodeSelector as [])
    await this.repo.saveConfig(
      'env/settings.yaml',
      `env/secrets.settings.yaml`,
      omit(settings, ['cluster', 'policies']),
      secretPaths ?? this.getSecretPaths(),
    )
  }

  async saveTeams(secretPaths?: string[]): Promise<void> {
    const filePath = 'env/teams.yaml'
    const secretFilePath = `env/secrets.teams.yaml`
    const teamValues = {}
    const teams = this.getTeams()
    await Promise.all(
      teams.map(async (inTeam) => {
        const team: Record<string, any> = omit(inTeam, 'name')
        const teamId = team.id as string
        await this.saveTeamApps(teamId)
        await this.saveTeamJobs(teamId)
        await this.saveTeamServices(teamId)
        await this.saveTeamSecrets(teamId)
        await this.saveTeamWorkloads(teamId)
        team.resourceQuota = arrayToObject((team.resourceQuota as []) ?? [])
        teamValues[teamId] = team
      }),
    )
    const values = set({}, 'teamConfig', teamValues)
    await this.repo.saveConfig(filePath, secretFilePath, values, secretPaths ?? this.getSecretPaths())
  }

  async saveTeamSecrets(teamId: string): Promise<void> {
    const secrets = this.db.getCollection('secrets', { teamId })
    const values: any[] = secrets.map((secret) => this.convertDbSecretToValues(secret))
    await this.repo.writeFile(getTeamSecretsFilePath(teamId), set({}, getTeamSecretsJsonPath(teamId), values))
  }

  async saveTeamWorkloads(teamId: string): Promise<void> {
    const workloads = this.db.getCollection('workloads', { teamId }) as Array<Workload>
    const cleaneWorkloads: Array<Record<string, any>> = workloads.map((obj) => {
      return omit(obj, ['teamId'])
    })
    const relativePath = getTeamWorkloadsFilePath(teamId)
    const outData: Record<string, any> = set({}, getTeamWorkloadsJsonPath(teamId), cleaneWorkloads)
    debug(`Saving workloads of team: ${teamId}`)
    await this.repo.writeFile(relativePath, outData)
    await Promise.all(
      workloads.map((workload) => {
        this.saveWorkloadValues(workload)
      }),
    )
  }

  async saveWorkloadValues(workload: Workload): Promise<void> {
    debug(`Saving workload values: id: ${workload.id!} teamId: ${workload.teamId!} name: ${workload.name}`)
    const data = this.getWorkloadValues(workload.id!)
    const outData = omit(data, ['id', 'teamId', 'name']) as Record<string, any>
    outData.values = stringifyYaml(data.values, undefined, 4)
    const path = getTeamWorkloadValuesFilePath(workload.teamId!, workload.name)

    await this.repo.writeFile(path, outData, false)
  }

  async saveTeamJobs(teamId: string): Promise<void> {
    const jobs = this.db.getCollection('jobs', { teamId })
    const jobsRaw = jobs.map((item) => omit(item, ['teamId']))
    const data = {}
    set(data, getTeamJobsJsonPath(teamId), jobsRaw)
    const filePath = getTeamJobsFilePath(teamId)
    await this.repo.writeFile(filePath, data)
  }

  async saveTeamServices(teamId: string): Promise<void> {
    const services = this.db.getCollection('services', { teamId })
    const data = {}
    const values: any[] = []
    services.forEach((service) => {
      const value = this.convertDbServiceToValues(service)
      values.push(value)
    })

    set(data, getTeamServicesJsonPath(teamId), values)
    const filePath = getTeamServicesFilePath(teamId)
    await this.repo.writeFile(filePath, data)
  }

  loadTeam(inTeam: Team): void {
    const team = { ...inTeam, name: inTeam.id } as Record<string, any>
    team.resourceQuota = objectToArray(inTeam.resourceQuota as Record<string, any>)
    const res = this.createTeam(team as Team)
    // const res: any = this.db.populateItem('teams', { ...team, name: team.id! }, undefined, team.id as string)
    debug(`Loaded team: ${res.id!}`)
  }

  loadSecret(inSecret, teamId): void {
    const secret: Record<string, any> = omit(inSecret, ...secretTransferProps)
    secret.teamId = teamId
    secret.secret = secretTransferProps.reduce((memo: any, prop) => {
      if (inSecret[prop] !== undefined) memo[prop] = inSecret[prop]
      return memo
    }, {})
    const res: any = this.db.populateItem('secrets', secret, { teamId, name: secret.name }, secret.id as string)
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

    const res: any = this.db.populateItem('services', removeBlankAttributes(svc), undefined, svc.id as string)
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
      svcCloned.ksvc.args = svc.ksvc.args?.length > 1 ? svc.ksvc.args.match(argSplit).map(argQuoteStrip) : svc.ksvc.args
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
    return svcCloned
  }

  async saveValues(): Promise<void> {
    const secretPaths = this.getSecretPaths()
    await this.saveCluster(secretPaths)
    await this.savePolicies()
    await this.saveSettings(secretPaths)
    await this.saveTeams(secretPaths)
    // also save admin apps
    await this.saveAdminApps(secretPaths)
    await this.saveTeamApps('admin')
  }

  async getSession(user: k8s.User): Promise<Session> {
    const rootStack = await getSessionStack()
    const currentSha = rootStack.repo.commitSha
    const data: Session = {
      ca: env.CUSTOM_ROOT_CA,
      core: this.getCore() as Record<string, any>,
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
