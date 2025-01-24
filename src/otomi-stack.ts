/* eslint-disable class-methods-use-this */
import * as k8s from '@kubernetes/client-node'
import { V1ObjectReference } from '@kubernetes/client-node'
import Debug from 'debug'

import { ObjectStorageKeyRegions, getRegions } from '@linode/api-v4'
import { emptyDir, pathExists, unlink } from 'fs-extra'
import { readFile, readdir, writeFile } from 'fs/promises'
import { generate as generatePassword } from 'generate-password'
import { cloneDeep, filter, get, isArray, isEmpty, map, omit, pick, set } from 'lodash'
import { getAppList, getAppSchema, getSpec } from 'src/app'
import Db from 'src/db'
import { AlreadyExists, GitPullError, OtomiError, PublicUrlExists, ValidationError } from 'src/error'
import { DbMessage, cleanAllSessions, cleanSession, getIo, getSessionStack } from 'src/middleware'
import {
  App,
  Backup,
  Build,
  Cloudtty,
  Coderepo,
  Core,
  K8sService,
  Netpol,
  ObjWizard,
  Policies,
  Policy,
  Project,
  SealedSecret,
  Secret,
  Service,
  Session,
  SessionUser,
  Settings,
  SettingsInfo,
  Team,
  TeamSelfService,
  User,
  Workload,
  WorkloadValues,
} from 'src/otomi-models'
import getRepo, { Repo } from 'src/repo'
import { arrayToObject, getServiceUrl, getValuesSchema, objectToArray, removeBlankAttributes } from 'src/utils'
import {
  CUSTOM_ROOT_CA,
  DEFAULT_PLATFORM_ADMIN_EMAIL,
  EDITOR_INACTIVITY_TIMEOUT,
  GIT_BRANCH,
  GIT_EMAIL,
  GIT_LOCAL_PATH,
  GIT_PASSWORD,
  GIT_REPO_URL,
  GIT_USER,
  HELM_CHART_CATALOG,
  OBJ_STORAGE_APPS,
  PREINSTALLED_EXCLUDED_APPS,
  TOOLS_HOST,
  VERSIONS,
  cleanEnv,
} from 'src/validators'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import {
  apply,
  checkPodExists,
  getCloudttyActiveTime,
  getKubernetesVersion,
  getLastTektonMessage,
  getSealedSecretsCertificate,
  getSecretValues,
  getTeamSecretsFromK8s,
  k8sdelete,
  watchPodUntilRunning,
} from './k8s_operations'
import { validateBackupFields } from './utils/backupUtils'
import { getPolicies } from './utils/policiesUtils'
import { encryptSecretItem } from './utils/sealedSecretUtils'
import { getKeycloakUsers } from './utils/userUtils'
import { ObjectStorageClient } from './utils/wizardUtils'
import { fetchWorkloadCatalog } from './utils/workloadUtils'

interface ExcludedApp extends App {
  managed: boolean
}
const debug = Debug('otomi:otomi-stack')

const secretTransferProps = ['type', 'ca', 'crt', 'key', 'entries', 'dockerconfig']

const env = cleanEnv({
  CUSTOM_ROOT_CA,
  DEFAULT_PLATFORM_ADMIN_EMAIL,
  EDITOR_INACTIVITY_TIMEOUT,
  GIT_BRANCH,
  GIT_EMAIL,
  GIT_LOCAL_PATH,
  GIT_PASSWORD,
  GIT_REPO_URL,
  GIT_USER,
  HELM_CHART_CATALOG,
  TOOLS_HOST,
  VERSIONS,
  PREINSTALLED_EXCLUDED_APPS,
  OBJ_STORAGE_APPS,
})

export function getTeamBackupsFilePath(teamId: string): string {
  return `env/teams/backups.${teamId}.yaml`
}
export function getTeamBackupsJsonPath(teamId: string): string {
  return `teamConfig.${teamId}.backups`
}

export function getTeamNetpolsFilePath(teamId: string): string {
  return `env/teams/netpols.${teamId}.yaml`
}
export function getTeamNetpolsJsonPath(teamId: string): string {
  return `teamConfig.${teamId}.netpols`
}

export function getTeamSealedSecretsFilePath(teamId: string): string {
  return `env/teams/sealedsecrets.${teamId}.yaml`
}

export function getTeamWorkloadsFilePath(teamId: string): string {
  return `env/teams/workloads.${teamId}.yaml`
}
export function getTeamWorkloadValuesFilePath(teamId: string, workloadName): string {
  return `env/teams/workloads/${teamId}/${workloadName}.yaml`
}

export function getTeamProjectsFilePath(teamId: string): string {
  return `env/teams/projects.${teamId}.yaml`
}

export function getTeamCodereposFilePath(teamId: string): string {
  return `env/teams/coderepos.${teamId}.yaml`
}

export function getTeamBuildsFilePath(teamId: string): string {
  return `env/teams/builds.${teamId}.yaml`
}

export function getTeamPoliciesFilePath(teamId: string): string {
  return `env/teams/policies.${teamId}.yaml`
}

export function getTeamWorkloadsJsonPath(teamId: string): string {
  return `teamConfig.${teamId}.workloads`
}

export function getTeamProjectsJsonPath(teamId: string): string {
  return `teamConfig.${teamId}.projects`
}

export function getTeamCodereposJsonPath(teamId: string): string {
  return `teamConfig.${teamId}.coderepos`
}

export function getTeamBuildsJsonPath(teamId: string): string {
  return `teamConfig.${teamId}.builds`
}

export function getTeamPoliciesJsonPath(teamId: string): string {
  return `teamConfig.${teamId}.policies`
}

export function getTeamSealedSecretsJsonPath(teamId: string): string {
  return `teamConfig.${teamId}.sealedsecrets`
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
  sessionId?: string
  locked = false
  isLoaded = false
  repo: Repo

  constructor(editor?: string, sessionId?: string, inDb?: Db) {
    this.editor = editor
    this.sessionId = sessionId ?? 'main'
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

  async getValues(query): Promise<Record<string, any>> {
    return (await this.repo.requestValues(query)).data
  }
  getRepoPath() {
    if (env.isTest || this.sessionId === undefined) return env.GIT_LOCAL_PATH
    const folder = `${rootPath}/${this.sessionId}`
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

  getSettingsInfo(): SettingsInfo {
    const settings = this.db.db.get(['settings']).value() as Settings
    const { cluster, dns, obj, otomi, ingress, smtp } = pick(settings, [
      'cluster',
      'dns',
      'obj',
      'otomi',
      'ingress',
      'smtp',
    ]) as Settings
    const settingsInfo = {
      cluster: pick(cluster, ['name', 'domainSuffix', 'provider']),
      dns: pick(dns, ['zones']),
      obj: pick(obj, ['provider']),
      otomi: pick(otomi, ['hasExternalDNS', 'hasExternalIDP', 'isPreInstalled']),
      smtp: pick(smtp, ['smarthost']),
      ingressClassNames: map(ingress?.classes, 'className') ?? [],
    } as SettingsInfo
    return settingsInfo
  }

  async createObjWizard(data: ObjWizard): Promise<ObjWizard> {
    const { obj } = this.getSettings(['obj'])
    const settingsdata = { obj: { ...obj, showWizard: data.showWizard } }
    const createdBuckets = [] as Array<string>
    if (data?.apiToken && data?.regionId) {
      const { cluster } = this.getSettings(['cluster'])
      let lkeClusterId: null | number = null
      if (cluster?.name?.includes('aplinstall')) lkeClusterId = Number(cluster?.name?.replace('aplinstall', ''))
      else if (lkeClusterId === null)
        return { status: 'error', errorMessage: 'Cluster ID is not found in the cluster name.' }
      const bucketNames = {
        cnpg: `lke${lkeClusterId}-cnpg`,
        harbor: `lke${lkeClusterId}-harbor`,
        loki: `lke${lkeClusterId}-loki`,
        tempo: `lke${lkeClusterId}-tempo`,
        velero: `lke${lkeClusterId}-velero`,
        gitea: `lke${lkeClusterId}-gitea`,
        thanos: `lke${lkeClusterId}-thanos`,
      }
      const objectStorageClient = new ObjectStorageClient(data.apiToken)
      // Create object storage buckets
      for (const bucket in bucketNames) {
        const bucketLabel = await objectStorageClient.createObjectStorageBucket(
          bucketNames[bucket] as string,
          data.regionId,
        )
        if (bucketLabel instanceof OtomiError) {
          return {
            objBuckets: createdBuckets,
            status: 'error',
            errorMessage: bucketLabel.publicMessage,
          }
        } else {
          createdBuckets.push(bucketLabel)
          debug(`${bucketLabel} bucket is created.`)
        }
      }
      // Create object storage keys
      const objStorageKey = await objectStorageClient.createObjectStorageKey(
        lkeClusterId,
        data.regionId,
        Object.values(bucketNames),
      )

      if (objStorageKey instanceof OtomiError) return { status: 'error', errorMessage: objStorageKey.publicMessage }

      const { access_key, secret_key, regions } = objStorageKey
      // The data.regionId (for example 'eu-central') does not include the zone.
      // However, we need to add the region with the zone suffix (for example 'eu-central-1') in the object storage values.
      // Therefore, we need to extract the region with the zone suffix from the s3_endpoint.
      const { s3_endpoint } = regions.find((region) => region.id === data.regionId) as ObjectStorageKeyRegions
      const [objStorageRegion] = s3_endpoint.split('.')
      debug(`Object Storage keys are created.`)
      // Modify object storage settings
      settingsdata.obj = {
        showWizard: false,
        provider: {
          type: 'linode',
          linode: {
            accessKeyId: access_key,
            buckets: bucketNames,
            region: objStorageRegion,
            secretAccessKey: secret_key,
          },
        },
      }
    }
    await this.editSettings(settingsdata as Settings, 'obj')
    await this.doDeployment()
    debug('Object storage settings have been configured.')
    return {
      status: 'success',
      regionId: data.regionId,
      objBuckets: createdBuckets,
    } as ObjWizard
  }

  getSettings(keys?: string[]): Settings {
    const settings = this.db.db.get(['settings']).value()
    if (!keys) return settings
    return pick(settings, keys) as Settings
  }

  async loadIngressApps(id: string): Promise<void> {
    try {
      debug(`Loading ingress apps for ${id}`)
      const content = await this.repo.loadConfig('env/apps/ingress-nginx.yaml', 'env/apps/secrets.ingress-nginx.yaml')
      const values = content?.apps?.['ingress-nginx'] ?? {}
      const teamId = 'admin'
      this.db.createItem('apps', { enabled: true, values, rawValues: {}, teamId }, { teamId, id }, id)
      debug(`Ingress app loaded for ${id}`)
    } catch (error) {
      debug(`Failed to load ingress apps for ${id}:`)
    }
  }

  async removeIngressApps(id: string): Promise<void> {
    try {
      debug(`Removing ingress apps for ${id}`)
      const path = `env/apps/${id}.yaml`
      const secretsPath = `env/apps/secrets.${id}.yaml`
      this.db.deleteItem('apps', { teamId: 'admin', id })
      await this.repo.removeFile(path)
      await this.repo.removeFile(secretsPath)
      debug(`Ingress app removed for ${id}`)
    } catch (error) {
      debug(`Failed to remove ingress app for ${id}:`)
    }
  }

  async editIngressApps(settings: Settings, data: Settings, settingId: string): Promise<void> {
    if (settingId !== 'ingress') return
    const initClasses = settings[settingId]?.classes || []
    const initClassNames = initClasses.map((obj) => obj.className)
    const dataClasses = data[settingId]?.classes || []
    const dataClassNames = dataClasses.map((obj) => obj.className)
    // Ingress app addition
    for (const ingressClass of dataClasses) {
      if (!initClassNames.includes(ingressClass.className)) {
        const id = `ingress-nginx-${ingressClass.className}`
        await this.loadIngressApps(id)
      }
    }
    // Ingress app deletion
    for (const ingressClass of initClasses) {
      if (!dataClassNames.includes(ingressClass.className)) {
        const id = `ingress-nginx-${ingressClass.className}`
        await this.removeIngressApps(id)
      }
    }
  }

  async editSettings(data: Settings, settingId: string): Promise<Settings> {
    const settings = this.db.db.get('settings').value() as Settings
    await this.editIngressApps(settings, data, settingId)
    const updatedSettingsData: any = { ...data }
    // Preserve the otomi.adminPassword when editing otomi settings
    if (settingId === 'otomi') {
      updatedSettingsData.otomi = {
        ...updatedSettingsData.otomi,
        adminPassword: settings.otomi?.adminPassword,
      }
    }
    settings[settingId] = removeBlankAttributes(updatedSettingsData[settingId] as Record<string, any>)
    this.db.db.set('settings', settings).write()
    await this.doDeployment()
    return settings
  }

  // Check if the collection name already exists in any collection
  isCollectionNameTaken(collectionName: string, teamId: string, name: string): boolean {
    return this.db.getCollection(collectionName).some((e: any) => {
      return e.teamId === teamId && e.name === name
    })
  }

  filterExcludedApp(apps: App | App[]) {
    const excludedApps = PREINSTALLED_EXCLUDED_APPS.default.apps
    const settingsInfo = this.getSettingsInfo()
    if (!Array.isArray(apps)) {
      if (settingsInfo.otomi && settingsInfo.otomi.isPreInstalled && excludedApps.includes(apps.id)) {
        // eslint-disable-next-line no-param-reassign
        ;(apps as ExcludedApp).managed = true
        return apps as ExcludedApp
      }
    } else if (Array.isArray(apps)) {
      if (settingsInfo.otomi && settingsInfo.otomi.isPreInstalled)
        return apps.filter((app) => !excludedApps.includes(app.id))
      else return apps
    }
    return apps
  }

  getApp(teamId: string, id: string): App | ExcludedApp {
    // @ts-ignore
    const app = this.db.getItem('apps', { teamId, id }) as App
    this.filterExcludedApp(app)

    if (teamId === 'admin') return app
    const adminApp = this.db.getItem('apps', { teamId: 'admin', id: app.id }) as App
    return { ...cloneDeep(app), enabled: adminApp.enabled }
  }

  getApps(teamId: string, picks?: string[]): Array<App> {
    const apps = this.db.getCollection('apps', { teamId }) as Array<App>
    const providerSpecificApps = this.filterExcludedApp(apps) as App[]

    if (teamId === 'admin') return providerSpecificApps

    let teamApps = providerSpecificApps.map((app: App) => {
      const adminApp = this.db.getItem('apps', { teamId: 'admin', id: app.id }) as App
      return { ...cloneDeep(app), enabled: adminApp.enabled }
    })

    if (!picks) return teamApps

    if (picks.includes('enabled')) {
      const adminApps = this.db.getCollection('apps', { teamId: 'admin' }) as Array<App>

      teamApps = adminApps.map((adminApp) => {
        const teamApp = teamApps.find((app) => app.id === adminApp.id)
        return teamApp || { id: adminApp.id, enabled: adminApp.enabled }
      })
    }

    return teamApps.map((app) => pick(app, picks)) as Array<App>
  }

  async editApp(teamId, id, data: App): Promise<App> {
    // @ts-ignore
    let app: App = this.db.getItem('apps', { teamId, id })
    // Shallow merge, so only first level attributes can be replaced (values, rawValues, etc.)
    app = { ...app, ...data }
    const updatedApp = this.db.updateItem('apps', app as Record<string, any>, { teamId, id }) as App
    await this.doDeployment()
    return updatedApp
  }

  canToggleApp(id: string): boolean {
    const app = getAppSchema(id)
    return app.properties!.enabled !== undefined
  }

  async toggleApps(teamId: string, ids: string[], enabled: boolean): Promise<void> {
    ids.map((id) => {
      // we might be given a dep that is only relevant to core, or
      // which is essential, so skip it
      const orig = this.db.getItemReference('apps', { teamId, id }, false) as App
      if (orig && this.canToggleApp(id)) this.db.updateItem('apps', { enabled }, { teamId, id }, true)
    })
    await this.doDeployment()
  }

  async loadApp(appInstanceId: string): Promise<void> {
    const isIngressApp = appInstanceId.startsWith('ingress-nginx-')
    const appId = isIngressApp ? 'ingress-nginx' : appInstanceId
    const path = `env/apps/${appInstanceId}.yaml`
    const secretsPath = `env/apps/secrets.${appInstanceId}.yaml`
    const content = await this.repo.loadConfig(path, secretsPath)
    let values = content?.apps?.[appInstanceId] ?? {}
    if (appInstanceId === 'ingress-nginx-platform') {
      const isIngressNginxPlatformAppExists = await this.repo.fileExists(`env/apps/ingress-nginx-platform.yaml`)
      if (!isIngressNginxPlatformAppExists) {
        const defaultIngressNginxContent = await this.repo.loadConfig(
          `env/apps/ingress-nginx.yaml`,
          `env/apps/secrets.ingress-nginx.yaml`,
        )
        values = defaultIngressNginxContent?.apps?.['ingress-nginx'] ?? {}
      }
    }
    const rawValues = {}

    let enabled
    const app = getAppSchema(appId)
    if (app?.properties?.enabled) enabled = !!values.enabled

    // we do not want to send enabled flag to the input forms
    delete values.enabled
    const teamId = 'admin'
    this.db.createItem('apps', { enabled, values, rawValues, teamId }, { teamId, id: appInstanceId }, appInstanceId)
  }

  async loadApps(): Promise<void> {
    const apps = this.getAppList()
    await Promise.all(
      apps.map(async (appId) => {
        await this.loadApp(appId)
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

  async createTeam(data: Team, deploy = true): Promise<Team> {
    const id = data.id || data.name

    if (isEmpty(data.password)) {
      debug(`creating password for team '${data.name}'`)
      // eslint-disable-next-line no-param-reassign
      data.password = generatePassword({
        length: 16,
        numbers: true,
        symbols: true,
        lowercase: true,
        uppercase: true,
        exclude: String(':,;"/=|%\\\''),
      })
    }

    const team = this.db.createItem('teams', data, { id }, id) as Team
    const apps = getAppList()
    const core = this.getCore()
    apps.forEach((appId) => {
      const isShared = !!core.adminApps.find((a) => a.name === appId)?.isShared
      const inTeamApps = !!core.teamApps.find((a) => a.name === appId)
      // Admin apps are loaded by loadApps function
      if (id !== 'admin' && (isShared || inTeamApps)) this.db.createItem('apps', {}, { teamId: id, id: appId }, appId)
    })

    if (!data.id) {
      const policies = getPolicies()
      this.db.db.set(`policies[${data.name}]`, policies).write()
    }
    if (deploy) await this.doDeployment()
    return team
  }

  async editTeam(id: string, data: Team): Promise<Team> {
    const team = this.db.updateItem('teams', data, { id }) as Team
    await this.doDeployment()
    return team
  }

  async deleteTeam(id: string): Promise<void> {
    try {
      this.db.deleteItem('services', { id })
    } catch (e) {
      // no services found
    }
    this.db.deleteItem('teams', { id })
    await this.doDeployment()
  }

  getTeamServices(teamId: string): Array<Service> {
    const ids = { teamId }
    return this.db.getCollection('services', ids) as Array<Service>
  }

  getTeamBackups(teamId: string): Array<Backup> {
    const ids = { teamId }
    return this.db.getCollection('backups', ids) as Array<Backup>
  }

  getAllBackups(): Array<Backup> {
    return this.db.getCollection('backups') as Array<Backup>
  }

  async createBackup(teamId: string, data: Backup): Promise<Backup> {
    validateBackupFields(data.name, data.ttl)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const backup = this.db.createItem('backups', { ...data, teamId }, { teamId, name: data.name }) as Backup
      await this.doDeployment()
      return backup
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Backup name already exists'
      throw err
    }
  }

  getBackup(id: string): Backup {
    return this.db.getItem('backups', { id }) as Backup
  }

  async editBackup(id: string, data: Backup): Promise<Backup> {
    validateBackupFields(data.name, data.ttl)
    const backup = this.db.updateItem('backups', data, { id }) as Backup
    await this.doDeployment()
    return backup
  }

  async deleteBackup(id: string): Promise<void> {
    this.db.deleteItem('backups', { id })
    await this.doDeployment()
  }

  getTeamNetpols(teamId: string): Array<Netpol> {
    const ids = { teamId }
    return this.db.getCollection('netpols', ids) as Array<Netpol>
  }

  getAllNetpols(): Array<Netpol> {
    return this.db.getCollection('netpols') as Array<Netpol>
  }

  async createNetpol(teamId: string, data: Netpol): Promise<Netpol> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const netpol = this.db.createItem('netpols', { ...data, teamId }, { teamId, name: data.name }) as Netpol
      await this.doDeployment()
      return netpol
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Network policy name already exists'
      throw err
    }
  }

  getNetpol(id: string): Netpol {
    return this.db.getItem('netpols', { id }) as Netpol
  }

  async editNetpol(id: string, data: Netpol): Promise<Netpol> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const netpol = this.db.updateItem('netpols', data, { id }) as Netpol
    await this.doDeployment()
    return netpol
  }

  async deleteNetpol(id: string): Promise<void> {
    this.db.deleteItem('netpols', { id })
    await this.doDeployment()
  }

  getAllUsers(sessionUser: SessionUser): Array<User> {
    const users = this.db.getCollection('users') as Array<User>
    if (sessionUser.isPlatformAdmin) return users
    else if (sessionUser.isTeamAdmin) {
      const usersWithBasicInfo = users.map((user) => {
        const { id, email, isPlatformAdmin, isTeamAdmin, teams } = user
        return { id, email, isPlatformAdmin, isTeamAdmin, teams }
      })
      return usersWithBasicInfo as Array<User>
    } else return []
  }

  async createUser(data: User): Promise<User> {
    const initialPassword = generatePassword({
      length: 16,
      numbers: true,
      symbols: true,
      lowercase: true,
      uppercase: true,
      exclude: String(':,;"/=|%\\\''),
    })
    const user = { ...data, initialPassword }
    let existingUsers = this.db.getCollection('users') as any
    if (!env.isDev) {
      const { otomi, cluster } = this.getSettings(['otomi', 'cluster'])
      const keycloak = this.getApp('admin', 'keycloak')
      const keycloakBaseUrl = `https://keycloak.${cluster?.domainSuffix}`
      const realm = 'otomi'
      const username = keycloak?.values?.adminUsername as string
      const password = otomi?.adminPassword as string
      existingUsers = await getKeycloakUsers(keycloakBaseUrl, realm, username, password)
    }
    try {
      if (existingUsers.some((existingUser) => existingUser.email === user.email))
        throw new AlreadyExists('User email already exists')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const createdUser = this.db.createItem('users', user, { name: user.email }) as User
      await this.doDeployment()
      return createdUser
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'User email already exists'
      throw err
    }
  }

  getUser(id: string): User {
    return this.db.getItem('users', { id }) as User
  }

  async editUser(id: string, data: User): Promise<User> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const user = this.db.updateItem('users', data, { id }) as User
    await this.doDeployment()
    return user
  }

  async deleteUser(id: string): Promise<void> {
    const user = this.db.getItem('users', { id }) as User
    if (user.email === env.DEFAULT_PLATFORM_ADMIN_EMAIL) {
      const error = new OtomiError('Forbidden')
      error.code = 403
      error.publicMessage = 'Cannot delete the default platform admin user'
      throw error
    }
    this.db.deleteItem('users', { id })
    await this.doDeployment()
  }

  async editTeamUsers(
    data: Pick<User, 'id' | 'email' | 'isPlatformAdmin' | 'isTeamAdmin' | 'teams'>[],
  ): Promise<Array<User>> {
    data.forEach((user) => {
      const existingUser = this.db.getItem('users', { id: user.id }) as User
      this.db.updateItem('users', { ...existingUser, teams: user.teams }, { id: user.id }) as User
    })
    const users = this.db.getCollection('users') as Array<User>
    await this.doDeployment()
    return users
  }

  getTeamProjects(teamId: string): Array<Project> {
    const ids = { teamId }
    return this.db.getCollection('projects', ids) as Array<Project>
  }

  getAllProjects(): Array<Project> {
    return this.db.getCollection('projects') as Array<Project>
  }

  // Creates a new project and reserves a given name for 'builds', 'workloads' and 'services' resources
  async createProject(teamId: string, data: Project): Promise<Project> {
    // Check if the project name already exists in any collection
    const projectNameTaken = ['builds', 'workloads', 'services'].some((collectionName) =>
      this.isCollectionNameTaken(collectionName, teamId, data.name),
    )
    const projectNameTakenPublicMessage = `In the team '${teamId}' there is already a resource that match the project name '${data.name}'`

    try {
      if (projectNameTaken) throw new AlreadyExists(projectNameTakenPublicMessage)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const project = this.db.createItem('projects', { ...data, teamId }, { teamId, name: data.name }) as Project
      await this.doDeployment()
      return project
    } catch (err) {
      if (err.code === 409 && projectNameTaken) err.publicMessage = projectNameTakenPublicMessage
      else if (err.code === 409) err.publicMessage = 'Project name already exists'
      throw err
    }
  }

  getProject(id: string): Project {
    const p = this.db.getItem('projects', { id }) as Project
    let b, w, wv, s
    try {
      b = this.db.getItem('builds', { id: p.build?.id }) as Build
    } catch (err) {
      b = {}
    }
    try {
      w = this.db.getItem('workloads', { id: p.workload?.id }) as Workload
    } catch (err) {
      w = {}
    }
    try {
      wv = this.db.getItem('workloadValues', { id: p.workloadValues?.id }) as WorkloadValues
    } catch (err) {
      wv = {}
    }
    try {
      s = this.db.getItem('services', { id: p.service?.id }) as Service
    } catch (err) {
      s = {}
    }
    return { ...p, build: b, workload: w, workloadValues: wv, service: s }
  }

  async editProject(id: string, data: Project): Promise<Project> {
    const { build, workload, workloadValues, service, teamId, name } = data
    const { values } = workloadValues as WorkloadValues

    let b, w, wv, s
    if (!build?.id && build?.mode) b = this.db.createItem('builds', { ...build, teamId }, { teamId, name }) as Build
    else if (build?.id) b = this.db.updateItem('builds', build, { id: build.id }) as Build

    if (!workload?.id) w = this.db.createItem('workloads', { ...workload, teamId }, { teamId, name }) as Workload
    else w = this.db.updateItem('workloads', workload, { id: workload.id }) as Workload

    if (!data.workloadValues?.id)
      wv = this.db.createItem('workloadValues', { teamId, values }, { teamId, name }, w.id) as WorkloadValues
    else wv = this.db.updateItem('workloadValues', { teamId, values }, { id: workloadValues?.id }) as WorkloadValues

    if (!service?.id) s = this.db.createItem('services', { ...service, teamId }, { teamId, name }) as Service
    else s = this.db.updateItem('services', service, { id: service.id }) as Service

    const updatedData = {
      id,
      name,
      teamId,
      ...(b && { build: { id: b.id } }),
      workload: { id: w.id },
      workloadValues: { id: wv.id },
      service: { id: s.id },
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const project = this.db.updateItem('projects', updatedData, { id }) as Project
    await this.doDeployment()
    return project
  }

  // Deletes a project and all its related resources
  async deleteProject(id: string): Promise<void> {
    const p = this.db.getItem('projects', { id }) as Project
    if (p.build?.id) this.db.deleteItem('builds', { id: p.build.id })
    if (p.workload?.id) this.db.deleteItem('workloads', { id: p.workload.id })
    if (p.workloadValues?.id) this.db.deleteItem('workloadValues', { id: p.workloadValues.id })
    if (p.service?.id) this.db.deleteItem('services', { id: p.service.id })
    this.db.deleteItem('projects', { id })
    await this.doDeployment()
  }

  getTeamCoderepos(teamId: string): Array<Coderepo> {
    const ids = { teamId }
    return this.db.getCollection('coderepos', ids) as Array<Coderepo>
  }

  getAllCoderepos(): Array<Coderepo> {
    const allrepos = this.db.getCollection('coderepos') as Array<Coderepo>
    console.log('allrepos', allrepos)
    return allrepos
  }

  async createCoderepo(teamId: string, data: Project): Promise<Coderepo> {
    console.log('data', data)
    try {
      const project = this.db.createItem('coderepos', { ...data, teamId }, { teamId, name: data.name }) as Coderepo
      const allrepos = this.db.getCollection('coderepos') as Array<Coderepo>
      console.log('allrepos', allrepos)
      await this.doDeployment()
      return project
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Code repo name already exists'
      throw err
    }
  }

  getCoderepo(id: string): Coderepo {
    return this.db.getItem('coderepos', { id }) as Coderepo
  }

  async editCoderepo(id: string, data: Coderepo): Promise<Coderepo> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const coderepo = this.db.updateItem('coderepos', data, { id }) as Coderepo
    await this.doDeployment()
    return coderepo
  }

  async deleteCoderepo(id: string): Promise<void> {
    this.db.deleteItem('coderepos', { id })
    await this.doDeployment()
  }

  getDashboard(teamId: string): Array<any> {
    const ids = teamId !== 'admin' ? { teamId } : undefined
    const projects = this.db.getCollection('projects', ids) as Array<Project>
    const builds = this.db.getCollection('builds', ids) as Array<Build>
    const workloads = this.db.getCollection('workloads', ids) as Array<Workload>
    const services = this.db.getCollection('services', ids) as Array<Service>
    const secrets = this.db.getCollection('sealed-secrets', ids) as Array<SealedSecret>
    const netpols = this.db.getCollection('netpols', ids) as Array<Netpol>

    const inventory = [
      { name: 'projects', count: projects?.length },
      { name: 'builds', count: builds?.length },
      { name: 'workloads', count: workloads?.length },
      { name: 'services', count: services?.length },
      { name: 'sealed secrets', count: secrets?.length },
      { name: 'network policies', count: netpols?.length },
    ]
    return inventory
  }

  getTeamBuilds(teamId: string): Array<Build> {
    const ids = { teamId }
    return this.db.getCollection('builds', ids) as Array<Build>
  }

  getAllBuilds(): Array<Build> {
    return this.db.getCollection('builds') as Array<Build>
  }

  async createBuild(teamId: string, data: Build): Promise<Build> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const build = this.db.createItem('builds', { ...data, teamId }, { teamId, name: data.name }) as Build
      await this.doDeployment()
      return build
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Build name already exists'
      throw err
    }
  }

  getBuild(id: string): Build {
    return this.db.getItem('builds', { id }) as Build
  }

  async editBuild(id: string, data: Build): Promise<Build> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const build = this.db.updateItem('builds', data, { id }) as Build
    await this.doDeployment()
    return build
  }

  async deleteBuild(id: string): Promise<void> {
    const p = this.db.getCollection('projects') as Array<Project>
    p.forEach((project: Project) => {
      if (project?.build?.id === id) {
        const updatedData = { ...project, build: null }
        this.db.updateItem('projects', updatedData, { id: project.id }) as Project
      }
    })
    this.db.deleteItem('builds', { id })
    await this.doDeployment()
  }

  getTeamPolicies(teamId: string): Policies {
    const policies = this.db.db.get(['policies']).value()
    return policies[teamId]
  }

  getAllPolicies(): Record<string, Policies> {
    return this.db.db.get(['policies']).value()
  }

  getPolicy(teamId: string, id: string): Policy {
    const policies = this.db.db.get(['policies']).value()
    return policies[teamId][id]
  }

  async editPolicy(teamId: string, policyId: string, data: Policy): Promise<Policy> {
    const teamPolicies = this.getTeamPolicies(teamId)
    teamPolicies[policyId] = removeBlankAttributes(data)
    const policy = this.getPolicy(teamId, policyId)
    await this.doDeployment()
    return policy
  }

  async getK8sVersion(): Promise<string> {
    const version = (await getKubernetesVersion()) as string
    return version
  }

  async connectCloudtty(data: Cloudtty): Promise<Cloudtty | any> {
    const variables = {
      FQDN: data.domain,
      EMAIL: data.emailNoSymbols,
      SUB: data.sub,
    }

    const { userTeams } = data

    // if cloudtty does not exists then check if the pod is running and return it
    if (await checkPodExists('team-admin', `tty-${data.emailNoSymbols}`))
      return { ...data, iFrameUrl: `https://tty.${data.domain}/${data.emailNoSymbols}` }

    if (await pathExists('/tmp/ttyd.yaml')) await unlink('/tmp/ttyd.yaml')

    //if user is admin then read the manifests from ./dist/src/ttyManifests/adminTtyManifests
    const files = data.isAdmin
      ? await readdir('./dist/src/ttyManifests/adminTtyManifests', 'utf-8')
      : await readdir('./dist/src/ttyManifests', 'utf-8')
    const filteredFiles = files.filter((file) => file.startsWith('tty'))
    const variableKeys = Object.keys(variables)

    const podContentAddTargetTeam = (fileContent) => {
      const regex = new RegExp(`\\$TARGET_TEAM`, 'g')
      return fileContent.replace(regex, data.teamId)
    }

    // iterates over the rolebinding file and replace the $TARGET_TEAM with the team name for teams
    const rolebindingContentsForUsers = (fileContent) => {
      const rolebindingArray: string[] = []
      userTeams?.forEach((team: string) => {
        const regex = new RegExp(`\\$TARGET_TEAM`, 'g')
        const rolebindingForTeam: string = fileContent.replace(regex, team)
        rolebindingArray.push(rolebindingForTeam)
      })
      return rolebindingArray.join('\n')
    }

    const fileContents = await Promise.all(
      filteredFiles.map(async (file) => {
        let fileContent = data.isAdmin
          ? await readFile(`./dist/src/ttyManifests/adminTtyManifests/${file}`, 'utf-8')
          : await readFile(`./dist/src/ttyManifests/${file}`, 'utf-8')
        variableKeys.forEach((key) => {
          const regex = new RegExp(`\\$${key}`, 'g')
          fileContent = fileContent.replace(regex, variables[key])
        })
        if (file === 'tty_02_Pod.yaml') fileContent = podContentAddTargetTeam(fileContent)
        if (!data.isAdmin && file === 'tty_03_Rolebinding.yaml') fileContent = rolebindingContentsForUsers(fileContent)
        return fileContent
      }),
    )
    await writeFile('/tmp/ttyd.yaml', fileContents, 'utf-8')
    await apply('/tmp/ttyd.yaml')
    await watchPodUntilRunning('team-admin', `tty-${data.emailNoSymbols}`)

    // check the pod every 30 minutes and terminate it after 2 hours of inactivity
    const ISACTIVE_INTERVAL = 30 * 60 * 1000
    const TERMINATE_TIMEOUT = 2 * 60 * 60 * 1000
    const intervalId = setInterval(() => {
      getCloudttyActiveTime('team-admin', `tty-${data.emailNoSymbols}`).then((activeTime: number) => {
        if (activeTime > TERMINATE_TIMEOUT) {
          this.deleteCloudtty(data)
          clearInterval(intervalId)
          debug(`Cloudtty terminated after ${TERMINATE_TIMEOUT / (60 * 60 * 1000)} hours of inactivity`)
        }
      })
    }, ISACTIVE_INTERVAL)

    return { ...data, iFrameUrl: `https://tty.${data.domain}/${data.emailNoSymbols}` }
  }

  async deleteCloudtty(data: Cloudtty) {
    try {
      if (await checkPodExists('team-admin', `tty-${data.emailNoSymbols}`)) await k8sdelete(data)
    } catch (error) {
      debug('Failed to delete cloudtty')
    }
  }

  getTeamWorkloads(teamId: string): Array<Workload> {
    const ids = { teamId }
    return this.db.getCollection('workloads', ids) as Array<Workload>
  }

  getAllWorkloads(): Array<Workload> {
    return this.db.getCollection('workloads') as Array<Workload>
  }

  async getWorkloadCatalog(data: { url: string; sub: string; teamId: string }): Promise<any> {
    const { url: clientUrl, sub, teamId } = data
    let url = clientUrl
    if (env?.HELM_CHART_CATALOG && !clientUrl) url = env.HELM_CHART_CATALOG
    if (!url) {
      const err = {
        code: 404,
        message: 'No helm chart catalog found!',
      }
      throw err
    }
    const version = env.VERSIONS.core as string
    const { helmCharts, catalog } = await fetchWorkloadCatalog(url, sub, teamId, version)
    return { url, helmCharts, catalog }
  }

  async createWorkload(teamId: string, data: Workload): Promise<Workload> {
    try {
      const workload = this.db.createItem('workloads', { ...data, teamId }, { teamId, name: data.name }) as Workload
      this.db.createItem(
        'workloadValues',
        { teamId, values: {} },
        { teamId, name: workload.name },
        workload.id,
      ) as WorkloadValues
      await this.doDeployment()
      return workload
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Workload name already exists'
      throw err
    }
  }

  getWorkload(id: string): Workload {
    return this.db.getItem('workloads', { id }) as Workload
  }

  async editWorkload(id: string, data: Workload): Promise<Workload> {
    const workload = this.db.updateItem('workloads', data, { id }) as Workload
    await this.doDeployment()
    return workload
  }

  async deleteWorkload(id: string): Promise<void> {
    const p = this.db.getCollection('projects') as Array<Project>
    p.forEach((project: Project) => {
      if (project?.workload?.id === id) {
        const updatedData = { ...project, workload: null, workloadValues: null }
        this.db.updateItem('projects', updatedData, { id: project.id }) as Project
      }
    })
    const workloadValues = this.db.getItem('workloadValues', { id }) as WorkloadValues
    const path = getTeamWorkloadValuesFilePath(workloadValues.teamId!, workloadValues.name)
    await this.repo.removeFile(path)
    this.db.deleteItem('workloadValues', { id })
    this.db.deleteItem('workloads', { id })
    await this.doDeployment()
  }

  async editWorkloadValues(id: string, data: WorkloadValues): Promise<WorkloadValues> {
    const workloadValues = this.db.updateItem('workloadValues', data, { id }) as WorkloadValues
    await this.doDeployment()
    return workloadValues
  }

  getWorkloadValues(id: string): WorkloadValues {
    return this.db.getItem('workloadValues', { id }) as WorkloadValues
  }

  getAllServices(): Array<Service> {
    return this.db.getCollection('services') as Array<Service>
  }

  async createService(teamId: string, data: Service): Promise<Service> {
    this.checkPublicUrlInUse(data)
    try {
      const service = this.db.createItem(
        'services',
        { ...data, teamId },
        { teamId, name: data.name },
        data?.id,
      ) as Service
      await this.doDeployment()
      return service
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Service name already exists'
      throw err
    }
  }

  getService(id: string): Service {
    return this.db.getItem('services', { id }) as Service
  }

  async editService(id: string, data: Service): Promise<Service> {
    const service = this.db.updateItem('services', data, { id }) as Service
    await this.doDeployment()
    return service
  }

  async deleteService(id: string, deleteProjectService = true): Promise<void> {
    if (deleteProjectService) {
      const p = this.db.getCollection('projects') as Array<Project>
      p.forEach((project: Project) => {
        if (project?.service?.id === id) {
          const updatedData = { ...project, service: null }
          this.db.updateItem('projects', updatedData, { id: project.id }) as Project
        }
      })
    }
    this.db.deleteItem('services', { id })
    await this.doDeployment()
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

  emitPipelineStatus(sha: string): void {
    if (env.isDev) return
    try {
      // check pipeline status every 5 seconds and emit the status when it's completed
      const intervalId = setInterval(() => {
        getLastTektonMessage(sha).then((res: any) => {
          const { order, name, completionTime, status } = res
          if (completionTime) {
            getIo().emit('tekton', { order, name, completionTime, sha, status })
            clearInterval(intervalId)
            debug(`Tekton pipeline ${order} completed with status ${status}`)
          }
        })
      }, 5 * 1000)

      // fallback to clear interval after 10 minutes
      setTimeout(() => {
        clearInterval(intervalId)
      }, 10 * 60 * 1000)
    } catch (error) {
      debug('Error emitting pipeline status:', error)
    }
  }

  async doDeployment(): Promise<void> {
    const rootStack = await getSessionStack()
    if (rootStack.locked) return
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
      await cleanSession(this.sessionId!)
      const sha = await rootStack.repo.getCommitSha()
      this.emitPipelineStatus(sha)
    } catch (e) {
      // git conflict with upstream changes, clean up and restore the DB
      if (e instanceof GitPullError) await this.doRestore()
      const msg: DbMessage = { editor: 'system', state: 'corrupt', reason: 'deploy' }
      getIo().emit('db', msg)
      throw e
    } finally {
      rootStack.locked = false
    }
  }

  async doRestore(): Promise<void> {
    cleanAllSessions()
    await emptyDir(rootPath)
    // and re-init root
    const rootStack = await getSessionStack()
    await rootStack.initRepo()
  }

  apiClient?: k8s.CoreV1Api

  getApiClient(): k8s.CoreV1Api {
    if (this.apiClient) return this.apiClient
    const kc = new k8s.KubeConfig()
    kc.loadFromDefault()
    this.apiClient = kc.makeApiClient(k8s.CoreV1Api)
    return this.apiClient
  }

  async getK8sServices(teamId: string): Promise<Array<K8sService>> {
    // const teams = user.teams.map((name) => {
    //   return `team-${name}`
    // })

    const client = this.getApiClient()
    const collection: K8sService[] = []

    // if (user.isAdmin) {
    //   const svcList = await client.listServiceForAllNamespaces()
    //   svcList.body.items.map((item) => {
    //     collection.push({
    //       name: item.metadata!.name ?? 'unknown',
    //       ports: item.spec?.ports?.map((portItem) => portItem.port) ?? [],
    //     })
    //   })
    //   return collection
    // }

    const svcList = await client.listNamespacedService(`team-${teamId}`)
    svcList.body.items.map((item) => {
      let name = item.metadata!.name ?? 'unknown'
      let managedByKnative = false
      // Filter out knative private services
      if (item.metadata?.labels?.['networking.internal.knative.dev/serviceType'] === 'Private') return
      // Filter out services that are knative service revision
      if (item.spec?.type === 'ClusterIP' && item.metadata?.labels?.['serving.knative.dev/service']) return
      if (item.spec?.type === 'ExternalName' && item.metadata?.labels?.['serving.knative.dev/service']) {
        name = item.metadata?.labels?.['serving.knative.dev/service']
        managedByKnative = true
      }

      collection.push({
        name,
        ports: item.spec?.ports?.map((portItem) => portItem.port) ?? [],
        managedByKnative,
      })
    })

    return collection
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
    const saRes = await client.readNamespacedServiceAccount(`kubectl`, namespace)
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

  async createSealedSecret(teamId: string, data: SealedSecret): Promise<SealedSecret> {
    const namespace = data.namespace ?? `team-${teamId}`
    const certificate = await getSealedSecretsCertificate()
    if (!certificate) {
      const err = new ValidationError()
      err.publicMessage = 'SealedSecrets certificate not found'
      throw err
    }
    try {
      const encryptedDataPromises = data.encryptedData.map((obj) => {
        const encryptedItem = encryptSecretItem(certificate, data.name, namespace, obj.value, 'namespace-wide')
        return { [obj.key]: encryptedItem }
      })
      const encryptedData = Object.assign({}, ...(await Promise.all(encryptedDataPromises)))
      const sealedSecret = this.db.createItem(
        'sealedsecrets',
        { ...data, teamId, encryptedData, namespace },
        { teamId, name: data.name },
      ) as SealedSecret
      await this.doDeployment()
      return sealedSecret
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'SealedSecret name already exists'
      throw err
    }
  }

  async editSealedSecret(id: string, data: SealedSecret): Promise<SealedSecret> {
    const namespace = data.namespace ?? `team-${data?.teamId}`
    const certificate = await getSealedSecretsCertificate()
    if (!certificate) {
      const err = new ValidationError()
      err.publicMessage = 'SealedSecrets certificate not found'
      throw err
    }
    const encryptedDataPromises = data.encryptedData.map((obj) => {
      const encryptedItem = encryptSecretItem(certificate, data.name, namespace, obj.value, 'namespace-wide')
      return { [obj.key]: encryptedItem }
    })
    const encryptedData = Object.assign({}, ...(await Promise.all(encryptedDataPromises)))
    const sealedSecret = this.db.updateItem('sealedsecrets', { ...data, encryptedData }, { id }) as SealedSecret
    await this.doDeployment()
    return sealedSecret
  }

  async deleteSealedSecret(id: string): Promise<void> {
    this.db.deleteItem('sealedsecrets', { id })
    await this.doDeployment()
  }

  async getSealedSecret(id: string): Promise<SealedSecret> {
    const sealedSecret = this.db.getItem('sealedsecrets', { id }) as SealedSecret
    const namespace = sealedSecret.namespace ?? `team-${sealedSecret.teamId}`
    const secretValues = (await getSecretValues(sealedSecret.name, namespace)) || {}
    const isDisabled = isEmpty(secretValues)
    const encryptedData = Object.entries(sealedSecret.encryptedData).map(([key, value]) => ({
      key,
      value: secretValues?.[key] || value,
    }))
    const res = { ...sealedSecret, encryptedData, isDisabled } as any
    return res
  }

  getAllSealedSecrets(): Array<SealedSecret> {
    return this.db.getCollection('sealedsecrets', {}) as Array<SealedSecret>
  }

  getSealedSecrets(teamId: string): Array<SealedSecret> {
    return this.db.getCollection('sealedsecrets', { teamId }) as Array<SealedSecret>
  }

  async getSecretsFromK8s(teamId: string): Promise<Array<string>> {
    const secrets = await getTeamSecretsFromK8s(`team-${teamId}`)
    return secrets
  }

  async loadValues(): Promise<Promise<Promise<Promise<Promise<void>>>>> {
    debug('Loading values')
    await this.loadCluster()
    await this.loadSettings()
    await this.loadUsers()
    await this.loadTeams()
    await this.loadApps()
    this.isLoaded = true
  }

  async loadCluster(): Promise<void> {
    const data = await this.repo.loadConfig('env/cluster.yaml', 'env/secrets.cluster.yaml')
    // @ts-ignore
    this.db.db.get('settings').assign(data).write()
  }

  async loadSettings(): Promise<void> {
    const data: Record<string, any> = await this.repo.loadConfig('env/settings.yaml', `env/secrets.settings.yaml`)
    data.otomi!.nodeSelector = objectToArray((data.otomi!.nodeSelector ?? {}) as Record<string, any>)
    // @ts-ignore
    this.db.db.get('settings').assign(data).write()
  }

  async loadUsers(): Promise<void> {
    const { secretFilePostfix } = this.repo
    const relativePath = `env/secrets.users.yaml`
    const secretRelativePath = `${relativePath}${secretFilePostfix}`
    if (!(await this.repo.fileExists(relativePath)) || !(await this.repo.fileExists(secretRelativePath))) {
      debug(`No users found`)
      return
    }
    const data = await this.repo.readFile(secretRelativePath)
    const inData: Array<User> = get(data, `users`, [])
    inData.forEach((inUser) => {
      const res: any = this.db.populateItem('users', { ...inUser }, undefined, inUser.id as string)
      debug(`Loaded user: email: ${res.name}, id: ${res.id}`)
    })
  }

  async loadTeamSealedSecrets(teamId: string): Promise<void> {
    const relativePath = getTeamSealedSecretsFilePath(teamId)
    if (!(await this.repo.fileExists(relativePath))) {
      debug(`Team ${teamId} has no sealed secrets yet`)
      return
    }
    const data = await this.repo.readFile(relativePath)
    const inData: Array<SealedSecret> = get(data, getTeamSealedSecretsJsonPath(teamId), [])
    inData.forEach((inSealedSecret) => {
      const res: any = this.db.populateItem(
        'sealedsecrets',
        { ...inSealedSecret, teamId },
        undefined,
        inSealedSecret.id as string,
      )
      debug(`Loaded sealed secret: name: ${res.name}, id: ${res.id}, teamId: ${res.teamId}`)
    })
  }

  async loadTeamBackups(teamId: string): Promise<void> {
    const relativePath = getTeamBackupsFilePath(teamId)
    if (!(await this.repo.fileExists(relativePath))) {
      debug(`Team ${teamId} has no backups yet`)
      return
    }
    const data = await this.repo.readFile(relativePath)
    const inData: Array<Backup> = get(data, getTeamBackupsJsonPath(teamId), [])
    inData.forEach((inBackup) => {
      const res: any = this.db.populateItem('backups', { ...inBackup, teamId }, undefined, inBackup.id as string)
      debug(`Loaded backup: name: ${res.name}, id: ${res.id}, teamId: ${res.teamId}`)
    })
  }

  async loadTeamNetpols(teamId: string): Promise<void> {
    const relativePath = getTeamNetpolsFilePath(teamId)
    if (!(await this.repo.fileExists(relativePath))) {
      debug(`Team ${teamId} has no network policies yet`)
      return
    }
    const data = await this.repo.readFile(relativePath)
    const inData: Array<Netpol> = get(data, getTeamNetpolsJsonPath(teamId), [])
    inData.forEach((inNetpol) => {
      const res: any = this.db.populateItem('netpols', { ...inNetpol, teamId }, undefined, inNetpol.id as string)
      debug(`Loaded network policy: name: ${res.name}, id: ${res.id}, teamId: ${res.teamId}`)
    })
  }

  async loadTeamProjects(teamId: string): Promise<void> {
    const relativePath = getTeamProjectsFilePath(teamId)
    if (!(await this.repo.fileExists(relativePath))) {
      debug(`Team ${teamId} has no projects yet`)
      return
    }
    const data = await this.repo.readFile(relativePath)
    const inData: Array<Project> = get(data, getTeamProjectsJsonPath(teamId), [])
    inData.forEach((inProject) => {
      const res: any = this.db.populateItem('projects', { ...inProject, teamId }, undefined, inProject.id as string)
      debug(`Loaded project: name: ${res.name}, id: ${res.id}, teamId: ${res.teamId}`)
    })
  }

  async loadTeamCoderepos(teamId: string): Promise<void> {
    const relativePath = getTeamCodereposFilePath(teamId)
    if (!(await this.repo.fileExists(relativePath))) {
      debug(`Team ${teamId} has no coderepos yet`)
      return
    }
    const data = await this.repo.readFile(relativePath)
    const inData: Array<Project> = get(data, getTeamCodereposJsonPath(teamId), [])
    inData.forEach((inCoderepo) => {
      const res: any = this.db.populateItem('coderepos', { ...inCoderepo, teamId }, undefined, inCoderepo.id as string)
      debug(`Loaded coderepo: name: ${res.name}, id: ${res.id}, teamId: ${res.teamId}`)
    })
  }

  async loadTeamBuilds(teamId: string): Promise<void> {
    const relativePath = getTeamBuildsFilePath(teamId)
    if (!(await this.repo.fileExists(relativePath))) {
      debug(`Team ${teamId} has no builds yet`)
      return
    }
    const data = await this.repo.readFile(relativePath)
    const inData: Array<Build> = get(data, getTeamBuildsJsonPath(teamId), [])
    inData.forEach((inBuild) => {
      const res: any = this.db.populateItem('builds', { ...inBuild, teamId }, undefined, inBuild.id as string)
      debug(`Loaded build: name: ${res.name}, id: ${res.id}, teamId: ${res.teamId}`)
    })
  }

  async loadTeamPolicies(teamId: string): Promise<void> {
    const relativePath = getTeamPoliciesFilePath(teamId)
    if (!(await this.repo.fileExists(relativePath))) {
      debug(`Team ${teamId} has no policies yet`)
      return
    }
    const data = await this.repo.readFile(relativePath)
    const inData: any = get(data, getTeamPoliciesJsonPath(teamId), {})
    this.db.db.set(`policies[${teamId}]`, inData).write()
    debug(`Loaded policies of team: ${teamId}`)
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
    await Promise.all(
      Object.values(tc).map(async (team: Team) => {
        await this.loadTeam(team)
        this.loadTeamNetpols(team.id!)
        this.loadTeamServices(team.id!)
        this.loadTeamSealedSecrets(team.id!)
        this.loadTeamWorkloads(team.id!)
        this.loadTeamBackups(team.id!)
        this.loadTeamProjects(team.id!)
        this.loadTeamCoderepos(team.id!)
        this.loadTeamBuilds(team.id!)
        this.loadTeamPolicies(team.id!)
      }),
    )
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

  async saveSettings(secretPaths?: string[]): Promise<void> {
    const settings = cloneDeep(this.getSettings()) as Record<string, Record<string, any>>
    settings.otomi.nodeSelector = arrayToObject(settings.otomi.nodeSelector as [])
    await this.repo.saveConfig(
      'env/settings.yaml',
      `env/secrets.settings.yaml`,
      omit(settings, ['cluster']),
      secretPaths ?? this.getSecretPaths(),
    )
  }

  async saveUsers(): Promise<void> {
    const users = this.db.getCollection('users') as Array<User>
    const relativePath = `env/secrets.users.yaml`
    const { secretFilePostfix } = this.repo
    let secretRelativePath = `${relativePath}${secretFilePostfix}`
    if (secretFilePostfix) {
      const secretExists = await this.repo.fileExists(relativePath)
      if (!secretExists) secretRelativePath = relativePath
    }
    const outData: Record<string, any> = set({}, `users`, users)
    debug(`Saving users`)
    await this.repo.writeFile(secretRelativePath, outData, false)
    if (users.length === 0) {
      await this.repo.removeFile(relativePath)
      await this.repo.removeFile(secretRelativePath)
    }
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
        await this.saveTeamBackups(teamId)
        await this.saveTeamNetpols(teamId)
        await this.saveTeamServices(teamId)
        await this.saveTeamSealedSecrets(teamId)
        await this.saveTeamWorkloads(teamId)
        await this.saveTeamProjects(teamId)
        await this.saveTeamCoderepos(teamId)
        await this.saveTeamBuilds(teamId)
        await this.saveTeamPolicies(teamId)
        team.resourceQuota = arrayToObject((team.resourceQuota as []) ?? [])
        teamValues[teamId] = team
      }),
    )
    const values = set({}, 'teamConfig', teamValues)
    await this.repo.saveConfig(filePath, secretFilePath, values, secretPaths ?? this.getSecretPaths())
  }

  async saveTeamSealedSecrets(teamId: string): Promise<void> {
    const secrets = this.db.getCollection('sealedsecrets', { teamId })
    const cleaneSecrets: Array<Record<string, any>> = secrets.map((obj) => {
      return omit(obj, ['teamId'])
    })
    const relativePath = getTeamSealedSecretsFilePath(teamId)
    const outData: Record<string, any> = set({}, getTeamSealedSecretsJsonPath(teamId), cleaneSecrets)
    debug(`Saving sealed secrets of team: ${teamId}`)
    await this.repo.writeFile(relativePath, outData)
  }

  async saveTeamBackups(teamId: string): Promise<void> {
    const backups = this.db.getCollection('backups', { teamId }) as Array<Backup>
    const cleaneBackups: Array<Record<string, any>> = backups.map((obj) => {
      return omit(obj, ['teamId'])
    })
    const relativePath = getTeamBackupsFilePath(teamId)
    const outData: Record<string, any> = set({}, getTeamBackupsJsonPath(teamId), cleaneBackups)
    debug(`Saving backups of team: ${teamId}`)
    await this.repo.writeFile(relativePath, outData)
  }

  async saveTeamNetpols(teamId: string): Promise<void> {
    const netpols = this.db.getCollection('netpols', { teamId }) as Array<Netpol>
    const cleaneNetpols: Array<Record<string, any>> = netpols.map((obj) => {
      return omit(obj, ['teamId'])
    })
    const relativePath = getTeamNetpolsFilePath(teamId)
    const outData: Record<string, any> = set({}, getTeamNetpolsJsonPath(teamId), cleaneNetpols)
    debug(`Saving network policies of team: ${teamId}`)
    await this.repo.writeFile(relativePath, outData)
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

  async saveTeamProjects(teamId: string): Promise<void> {
    const projects = this.db.getCollection('projects', { teamId }) as Array<Project>
    const cleaneProjects: Array<Record<string, any>> = projects.map((obj) => {
      return omit(obj, ['teamId'])
    })
    const relativePath = getTeamProjectsFilePath(teamId)
    const outData: Record<string, any> = set({}, getTeamProjectsJsonPath(teamId), cleaneProjects)
    debug(`Saving projects of team: ${teamId}`)
    await this.repo.writeFile(relativePath, outData)
  }

  async saveTeamCoderepos(teamId: string): Promise<void> {
    const coderepos = this.db.getCollection('coderepos', { teamId }) as Array<Coderepo>
    const cleaneProjects: Array<Record<string, any>> = coderepos.map((obj) => {
      return omit(obj, ['teamId'])
    })
    const relativePath = getTeamCodereposFilePath(teamId)
    const outData: Record<string, any> = set({}, getTeamCodereposJsonPath(teamId), cleaneProjects)
    debug(`Saving coderepos of team: ${teamId}`)
    await this.repo.writeFile(relativePath, outData)
  }

  async saveTeamBuilds(teamId: string): Promise<void> {
    const builds = this.db.getCollection('builds', { teamId }) as Array<Build>
    const cleaneBuilds: Array<Record<string, any>> = builds.map((obj) => {
      return omit(obj, ['teamId'])
    })
    const relativePath = getTeamBuildsFilePath(teamId)
    const outData: Record<string, any> = set({}, getTeamBuildsJsonPath(teamId), cleaneBuilds)
    debug(`Saving builds of team: ${teamId}`)
    await this.repo.writeFile(relativePath, outData)
  }

  async saveTeamPolicies(teamId: string): Promise<void> {
    const policies = this.getTeamPolicies(teamId)
    const relativePath = getTeamPoliciesFilePath(teamId)
    const outData: Record<string, Policies> = set({}, getTeamPoliciesJsonPath(teamId), policies)
    debug(`Saving policies of team: ${teamId}`)
    await this.repo.writeFile(relativePath, outData)
  }

  async saveWorkloadValues(workload: Workload): Promise<void> {
    debug(`Saving workload values: id: ${workload.id!} teamId: ${workload.teamId!} name: ${workload.name}`)
    const data = this.getWorkloadValues(workload.id!)
    const outData = omit(data, ['id', 'teamId', 'name']) as Record<string, any>
    outData.values = stringifyYaml(data.values, undefined, 4)
    const path = getTeamWorkloadValuesFilePath(workload.teamId!, workload.name)

    await this.repo.writeFile(path, outData, false)
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

  async loadTeam(inTeam: Team): Promise<void> {
    const team = { ...inTeam, name: inTeam.id } as Record<string, any>
    team.resourceQuota = objectToArray(inTeam.resourceQuota as Record<string, any>)
    const res = await this.createTeam(team as Team, false)
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
      'paths',
      'type',
      'ownHost',
      'tlsPass',
      'ingressClassName',
      'headers',
      'useCname',
      'cname',
    )
    svc.teamId = teamId
    if (!('name' in svcRaw)) debug('Unknown service structure')
    if (svcRaw.type === 'cluster') svc.ingress = { type: 'cluster' }
    else {
      const { cluster, dns } = this.getSettings(['cluster', 'dns'])
      const url = getServiceUrl({ domain: svcRaw.domain, name: svcRaw.name, teamId, cluster, dns })
      // TODO remove the isArray check in 0.5.24
      const headers = isArray(svcRaw.headers) ? undefined : svcRaw.headers
      svc.ingress = {
        certArn: svcRaw.certArn || undefined,
        certName: svcRaw.certName || undefined,
        domain: url.domain,
        headers,
        forwardPath: 'forwardPath' in svcRaw,
        hasCert: 'hasCert' in svcRaw,
        paths: svcRaw.paths ? svcRaw.paths : [],
        subdomain: url.subdomain,
        tlsPass: 'tlsPass' in svcRaw,
        type: svcRaw.type,
        useDefaultHost: !svcRaw.domain && svcRaw.ownHost,
        ingressClassName: svcRaw.ingressClassName || undefined,
        useCname: svcRaw.useCname,
        cname: svcRaw.cname,
      }
    }

    const res: any = this.db.populateItem('services', removeBlankAttributes(svc), undefined, svc.id as string)
    debug(`Loaded service: name: ${res.name}, id: ${res.id}`)
  }

  // eslint-disable-next-line class-methods-use-this
  convertDbServiceToValues(svc: any): any {
    const svcCloned = omit(svc, ['teamId', 'ingress', 'path'])
    if (svc.ingress && svc.ingress.type !== 'cluster') {
      const ing = svc.ingress
      if (ing.useDefaultHost) svcCloned.ownHost = true
      else svcCloned.domain = ing.subdomain ? `${ing.subdomain}.${ing.domain}` : ing.domain
      if (ing.hasCert) svcCloned.hasCert = true
      if (ing.certName) svcCloned.certName = ing.certName
      if (ing.certArn) svcCloned.certArn = ing.certArn
      if (ing.paths) svcCloned.paths = ing.paths
      if (ing.forwardPath) svcCloned.forwardPath = true
      if (ing.tlsPass) svcCloned.tlsPass = true
      if (ing.ingressClassName) svcCloned.ingressClassName = ing.ingressClassName
      if (ing.headers) svcCloned.headers = ing.headers
      if (ing.useCname) svcCloned.useCname = ing.useCname
      if (ing.cname) svcCloned.cname = ing.cname
      svcCloned.type = svc.ingress.type
    } else svcCloned.type = 'cluster'
    return svcCloned
  }

  async saveValues(): Promise<void> {
    const secretPaths = this.getSecretPaths()
    await this.saveCluster(secretPaths)
    await this.saveSettings(secretPaths)
    await this.saveUsers()
    await this.saveTeams(secretPaths)
    // also save admin apps
    await this.saveAdminApps(secretPaths)
  }

  async getSession(user: k8s.User): Promise<Session> {
    const rootStack = await getSessionStack()
    const valuesSchema = await getValuesSchema()
    const currentSha = rootStack.repo.commitSha
    const { obj } = this.getSettings(['obj'])
    const regions = await getRegions()
    const objStorageRegions =
      regions.data
        .filter((region) => region.capabilities.includes('Object Storage'))
        .map(({ id, label }) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label)) || []
    const data: Session = {
      ca: env.CUSTOM_ROOT_CA,
      core: this.getCore() as Record<string, any>,
      corrupt: rootStack.repo.corrupt,
      editor: this.editor,
      inactivityTimeout: env.EDITOR_INACTIVITY_TIMEOUT,
      user: user as SessionUser,
      defaultPlatformAdminEmail: env.DEFAULT_PLATFORM_ADMIN_EMAIL,
      objectStorage: {
        showWizard: obj?.showWizard ?? true,
        objStorageApps: env.OBJ_STORAGE_APPS,
        objStorageRegions,
      },
      versions: {
        core: env.VERSIONS.core,
        api: env.VERSIONS.api ?? process.env.npm_package_version,
        console: env.VERSIONS.console,
        values: currentSha,
      },
      valuesSchema,
    }
    return data
  }
}
