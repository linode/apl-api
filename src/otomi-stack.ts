/* eslint-disable class-methods-use-this */
import * as k8s from '@kubernetes/client-node'
import { V1ObjectReference } from '@kubernetes/client-node'
import Debug from 'debug'

import { getRegions, ObjectStorageKeyRegions } from '@linode/api-v4'
import { emptyDir, pathExists, unlink } from 'fs-extra'
import { readdir, readFile, writeFile } from 'fs/promises'
import { generate as generatePassword } from 'generate-password'
import { cloneDeep, filter, isEmpty, map, mapValues, omit, pick, unset } from 'lodash'
import { getAppList, getAppSchema, getSpec } from 'src/app'
import { AlreadyExists, GitPullError, HttpError, OtomiError, PublicUrlExists, ValidationError } from 'src/error'
import { cleanAllSessions, cleanSession, DbMessage, getIo, getSessionStack } from 'src/middleware'
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
  Repo,
  SealedSecret,
  Service,
  Session,
  SessionUser,
  Settings,
  SettingsInfo,
  Team,
  TeamSelfService,
  TestRepoConnect,
  User,
  Workload,
  WorkloadValues,
} from 'src/otomi-models'
import getRepo, { Git } from 'src/git'
import { arrayToObject, getValuesSchema, removeBlankAttributes } from 'src/utils'
import {
  cleanEnv,
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
import {
  getGiteaRepoUrls,
  normalizeRepoUrl,
  testPrivateRepoConnect,
  testPublicRepoConnect,
} from './utils/coderepoUtils'
import { getPolicies } from './utils/policiesUtils'
import { EncryptedDataRecord, encryptSecretItem, sealedSecretManifest } from './utils/sealedSecretUtils'
import { getKeycloakUsers, isValidUsername } from './utils/userUtils'
import { ObjectStorageClient } from './utils/wizardUtils'
import { fetchWorkloadCatalog } from './utils/workloadUtils'
import { getFileMaps, loadValues } from './repo'
import { RepoService } from './services/RepoService'

interface ExcludedApp extends App {
  managed: boolean
}
const debug = Debug('otomi:otomi-stack')

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

export const rootPath = '/tmp/otomi/values'

export function getTeamSealedSecretsValuesRootPath(teamId: string): string {
  return `env/teams/${teamId}/sealedsecrets`
}
export function getTeamSealedSecretsValuesFilePath(teamId: string, sealedSecretsName: string): string {
  return `env/teams/${teamId}/sealedsecrets/${sealedSecretsName}`
}

export default class OtomiStack {
  private coreValues: Core
  editor?: string
  sessionId?: string
  isLoaded = false
  git: Git
  repoService: RepoService

  constructor(editor?: string, sessionId?: string) {
    this.editor = editor
    this.sessionId = sessionId ?? 'main'
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
    return (await this.git.requestValues(query)).data
  }
  getRepoPath() {
    if (env.isTest || this.sessionId === undefined) return env.GIT_LOCAL_PATH
    return `${rootPath}/${this.sessionId}`
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

  transformApps(appsObj: Record<string, any>): App[] {
    if (!appsObj || typeof appsObj !== 'object') return []

    return Object.entries(appsObj).map(([appId, appData]) => ({
      id: appId,
      enabled: appData.enabled ?? false,
      values: omit(appData, ['enabled']), // Remove `enabled` from values
      rawValues: {},
    }))
  }

  async initRepo(repoService?: RepoService): Promise<void> {
    if (repoService) {
      this.repoService = repoService
      return
    } else {
      // We need to map the app values, so it adheres the App interface
      const rawRepo = await loadValues(this.getRepoPath())

      rawRepo.apps = this.transformApps(rawRepo.apps)
      rawRepo.teamConfig = mapValues(rawRepo.teamConfig, (teamConfig) => ({
        ...teamConfig,
        apps: this.transformApps(teamConfig.apps),
      }))

      const repo = rawRepo as Repo
      this.repoService = new RepoService(repo)
    }
  }

  async initGit(): Promise<void> {
    await this.init()
    // every editor gets their own folder to detect conflicts upon deploy
    const path = this.getRepoPath()
    const branch = env.GIT_BRANCH
    const url = env.GIT_REPO_URL
    for (;;) {
      try {
        this.git = await getRepo(path, url, env.GIT_USER, env.GIT_EMAIL, env.GIT_PASSWORD, branch)
        await this.git.pull()
        //TODO fetch this url from the repo
        if (await this.git.fileExists('env/settings/cluster.yaml')) break
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
    await this.loadValues()
    debug(`Values are loaded for ${this.editor} in ${this.sessionId}`)
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
    return {
      cluster: pick(this.repoService.getCluster(), ['name', 'domainSuffix', 'provider']),
      dns: pick(this.repoService.getDns(), ['zones']),
      obj: pick(this.repoService.getObj(), ['provider']),
      otomi: pick(this.repoService.getOtomi(), ['hasExternalDNS', 'hasExternalIDP', 'isPreInstalled']),
      smtp: pick(this.repoService.getSmtp(), ['smarthost']),
      ingressClassNames: map(this.repoService.getIngress()?.classes, 'className') ?? [],
    } as SettingsInfo
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
    debug('Object storage settings have been configured.')
    return {
      status: 'success',
      regionId: data.regionId,
      objBuckets: createdBuckets,
    } as ObjWizard
  }

  getSettings(keys?: string[]): Settings {
    const settings = this.repoService.getSettings()
    if (!keys) return settings
    return pick(settings, keys) as Settings
  }

  async loadIngressApps(id: string): Promise<void> {
    try {
      debug(`Loading ingress apps for ${id}`)
      const content = await this.git.loadConfig('env/apps/ingress-nginx.yaml', 'env/apps/secrets.ingress-nginx.yaml')
      const values = content?.apps?.['ingress-nginx'] ?? {}
      const teamId = 'admin'
      this.repoService.getTeamConfigService(teamId).createApp({ enabled: true, values, rawValues: {}, id })
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
      this.repoService.deleteApp(id)
      await this.git.removeFile(path)
      await this.git.removeFile(secretsPath)
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
    const settings = this.repoService.getSettings()
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
    this.repoService.updateSettings(settings)
    await this.saveSettings()
    await this.doDeployment([
      'alerts',
      'cluster',
      'dns',
      'ingress',
      'kms',
      'obj',
      'oidc',
      'otomi',
      'platformBackups',
      'smtp',
      'versions',
    ])
    return settings
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

  getTeamApp(teamId: string, id: string): App | ExcludedApp {
    const app = this.getApp(id)
    this.filterExcludedApp(app)

    if (teamId === 'admin') return app
    const adminApp = this.repoService.getTeamConfigService(teamId).getApp(id)
    return { ...cloneDeep(app), enabled: adminApp.enabled }
  }

  getApp(name: string): App {
    return this.repoService.getApp(name)
  }

  getApps(teamId: string, picks?: string[]): Array<App> {
    const appList = this.getAppList()
    const apps = this.repoService.getApps().filter((app) => appList.includes(app.id))
    const providerSpecificApps = this.filterExcludedApp(apps) as App[]

    if (teamId === 'admin') return providerSpecificApps

    // If not team admin load available teamApps
    const core = this.getCore()
    let teamApps = providerSpecificApps
      .map((app: App) => {
        const isShared = !!core.adminApps.find((a) => a.name === app.id)?.isShared
        const inTeamApps = !!core.teamApps.find((a) => a.name === app.id)
        if (isShared || inTeamApps) return app
      })
      .filter((app): app is App => app !== undefined) // Ensures no `undefined` elements

    if (!picks) return teamApps

    if (picks.includes('enabled')) {
      const adminApps = this.repoService.getApps()

      teamApps = adminApps.map((adminApp) => {
        const teamApp = teamApps.find((app) => app.id === adminApp.id)
        return teamApp || { id: adminApp.id, enabled: adminApp.enabled }
      })
    }

    return teamApps.map((app) => pick(app, picks)) as Array<App>
  }

  async editApp(teamId: string, id: string, data: App): Promise<App> {
    let app: App = this.repoService.getApp(id)
    // Shallow merge, so only first level attributes can be replaced (values, rawValues, etc.)
    app = { ...app, ...data }
    app = this.repoService.updateApp(id, app)
    await this.saveAdminApps(app)
    await this.doDeployment(['apps'])
    return this.repoService.getApp(id)
  }

  canToggleApp(id: string): boolean {
    const app = getAppSchema(id)
    return app.properties!.enabled !== undefined
  }

  async toggleApps(teamId: string, ids: string[], enabled: boolean): Promise<void> {
    await Promise.all(
      ids.map(async (id) => {
        const orig = this.repoService.getApp(id)
        if (orig && this.canToggleApp(id)) {
          const app = this.repoService.updateApp(id, { enabled })
          await this.saveAdminApps(app)
        }
      }),
    )
    await this.doDeployment(['apps'])
  }

  getTeams(): Array<Team> {
    return this.repoService.getAllTeamSettings()
  }

  getTeamSelfServiceFlags(id: string): TeamSelfService {
    const data = this.getTeam(id)
    return data.selfService
  }

  getCore(): Core {
    return this.coreValues
  }

  getTeam(id: string): Team {
    const team = this.repoService.getTeamConfigService(id).getSettings()
    return { ...team, name: id }
  }

  async createTeam(data: Team, deploy = true): Promise<Team> {
    const teamName = data.name

    if (isEmpty(data.password)) {
      debug(`creating password for team '${data.name}'`)
      // eslint-disable-next-line no-param-reassign
      data.password = generatePassword({
        length: 16,
        numbers: true,
        symbols: '!@#$%&*',
        lowercase: true,
        uppercase: true,
        strict: true,
      })
    }

    const teamConfig = this.repoService.createTeamConfig(teamName, data)
    const team = teamConfig.settings
    const apps = getAppList()
    const core = this.getCore()
    apps.forEach((appId) => {
      const isShared = !!core.adminApps.find((a) => a.name === appId)?.isShared
      const inTeamApps = !!core.teamApps.find((a) => a.name === appId)
      // Admin apps are loaded by loadApps function
      if (teamName !== 'admin' && (isShared || inTeamApps))
        this.repoService.getTeamConfigService(teamName).createApp({ id: appId })
    })

    if (!data.id) {
      const policies = getPolicies()
      this.repoService.getTeamConfigService(teamName).updatePolicies(policies)
    }
    if (deploy) {
      await this.saveTeam(team)
      //TODO do this better for the teamconfig
      await this.doDeployment(['teamConfig'])
    }
    return team
  }

  async editTeam(id: string, data: Team): Promise<Team> {
    const team = this.repoService.getTeamConfigService(id).updateSettings(data)
    await this.saveTeam(team)
    await this.doDeployment(['settings'], id)
    return team
  }

  async deleteTeam(id: string): Promise<void> {
    await this.deleteTeamConfig(id)
    await this.doDeployment(['teamConfig'])
  }

  getTeamServices(teamId: string): Array<Service> {
    return this.repoService.getTeamConfigService(teamId).getServices()
  }

  getTeamBackups(teamId: string): Array<Backup> {
    return this.repoService.getTeamConfigService(teamId).getBackups()
  }

  getAllBackups(): Array<Backup> {
    return this.repoService.getAllBackups()
  }

  async createBackup(teamId: string, data: Backup): Promise<Backup> {
    validateBackupFields(data.name, data.ttl)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const backup = this.repoService.getTeamConfigService(teamId).createBackup(data)

      await this.saveTeamBackup(teamId, data)
      await this.doDeployment(['backups'], teamId)
      return backup
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Backup name already exists'
      throw err
    }
  }

  getBackup(teamId: string, id: string): Backup {
    return this.repoService.getTeamConfigService(teamId).getBackup(id)
  }

  async editBackup(teamId: string, id: string, data: Backup): Promise<Backup> {
    validateBackupFields(data.name, data.ttl)
    const backup = this.repoService.getTeamConfigService(teamId).updateBackup(id, data)
    await this.saveTeamBackup(teamId, data)
    await this.doDeployment(['backups'], teamId)
    return backup
  }

  async deleteBackup(teamId: string, id: string): Promise<void> {
    await this.deleteTeamBackup(teamId, id)
    await this.doDeployment(['backups'], teamId)
  }

  getTeamNetpols(teamId: string): Array<Netpol> {
    return this.repoService.getTeamConfigService(teamId).getNetpols()
  }

  getAllNetpols(): Array<Netpol> {
    return this.repoService.getAllNetpols()
  }

  async createNetpol(teamId: string, data: Netpol): Promise<Netpol> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const netpol = this.repoService.getTeamConfigService(teamId).createNetpol(data)
      await this.saveTeamNetpols(teamId, data)
      await this.doDeployment(['netpols'], teamId)
      return netpol
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Network policy name already exists'
      throw err
    }
  }

  getNetpol(teamId: string, id: string): Netpol {
    return this.repoService.getTeamConfigService(teamId).getNetpol(id)
  }

  async editNetpol(teamId: string, id: string, data: Netpol): Promise<Netpol> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const netpol = this.repoService.getTeamConfigService(teamId).updateNetpol(id, data)
    await this.saveTeamNetpols(teamId, data)
    await this.doDeployment(['netpols'], teamId)
    return netpol
  }

  async deleteNetpol(teamId: string, id: string): Promise<void> {
    const netpol = this.repoService.getTeamConfigService(teamId).getNetpol(id)
    await this.deleteTeamNetpol(teamId, netpol.name)
    await this.doDeployment(['netpols'], teamId)
  }

  getAllUsers(sessionUser: SessionUser): Array<User> {
    const users = this.repoService.getUsers()
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
    const { valid, error } = isValidUsername(data.email.split('@')[0])
    if (!valid) {
      throw new HttpError(400, error as string)
    }
    const initialPassword = generatePassword({
      length: 16,
      numbers: true,
      symbols: '!@#$%&*',
      lowercase: true,
      uppercase: true,
      strict: true,
    })
    const user = { ...data, initialPassword }
    let existingUsersEmail = this.repoService.getUsersEmail()
    if (!env.isDev) {
      const { otomi, cluster } = this.getSettings(['otomi', 'cluster'])
      const keycloak = this.getApp('keycloak')
      const keycloakBaseUrl = `https://keycloak.${cluster?.domainSuffix}`
      const realm = 'otomi'
      const username = keycloak?.values?.adminUsername as string
      const password = otomi?.adminPassword as string
      existingUsersEmail = await getKeycloakUsers(keycloakBaseUrl, realm, username, password)
    }
    try {
      if (existingUsersEmail.some((existingUser) => existingUser === user.email)) {
        throw new AlreadyExists('User email already exists')
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const createdUser = this.repoService.createUser(user)
      await this.saveUser(createdUser)
      await this.doDeployment(['users'])
      return createdUser
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'User email already exists'
      throw err
    }
  }

  getUser(id: string): User {
    return this.repoService.getUser(id)
  }

  async editUser(id: string, data: User): Promise<User> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const user = this.repoService.updateUser(id, data)
    await this.saveUser(user)
    await this.doDeployment(['users'])
    return user
  }

  async deleteUser(id: string): Promise<void> {
    const user = this.repoService.getUser(id)
    if (user.email === env.DEFAULT_PLATFORM_ADMIN_EMAIL) {
      const error = new OtomiError('Forbidden')
      error.code = 403
      error.publicMessage = 'Cannot delete the default platform admin user'
      throw error
    }
    await this.deleteUserFile(user)
    await this.doDeployment(['users'])
  }

  async editTeamUsers(
    data: Pick<User, 'id' | 'email' | 'isPlatformAdmin' | 'isTeamAdmin' | 'teams'>[],
  ): Promise<Array<User>> {
    for (const user of data) {
      const existingUser = this.repoService.getUser(user.id!)
      const updateUser = this.repoService.updateUser(user.id!, { ...existingUser, teams: user.teams })
      await this.saveUser(updateUser)
    }
    const users = this.repoService.getUsers()
    await this.doDeployment(['users'])
    return users
  }

  getTeamProjects(teamId: string): Array<Project> {
    return this.repoService.getTeamConfigService(teamId).getProjects()
  }

  getAllProjects(): Array<Project> {
    return this.repoService.getAllProjects()
  }

  // Creates a new project and reserves a given name for 'builds', 'workloads' and 'services' resources
  async createProject(teamId: string, data: Project): Promise<Project> {
    // Check if the project name already exists in any collection
    const projectNameTaken = this.repoService.getTeamConfigService(teamId).doesProjectNameExist(data.name)
    const projectNameTakenPublicMessage = `In the team '${teamId}' there is already a resource that match the project name '${data.name}'`

    try {
      if (projectNameTaken) throw new AlreadyExists(projectNameTakenPublicMessage)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const project = this.repoService.getTeamConfigService(teamId).createProject({ ...data, teamId })
      if (data.build) {
        await this.createBuild(teamId, data.build)
      }
      if (data.workload) {
        await this.createWorkload(teamId, data.workload)
      }
      if (data.service) {
        await this.createService(teamId, data.service)
      }
      await this.saveTeamProject(teamId, data)
      await this.doDeployment(['projects'], teamId)
      return project
    } catch (err) {
      if (err.code === 409 && projectNameTaken) err.publicMessage = projectNameTakenPublicMessage
      else if (err.code === 409) err.publicMessage = 'Project name already exists'
      throw err
    }
  }

  getProject(teamId: string, id: string): Project {
    const project = this.repoService.getTeamConfigService(teamId).getProject(id)
    let build, workload, workloadValues, services
    try {
      build = this.repoService.getTeamConfigService(teamId).getBuild(project.build!.id!)
    } catch (err) {
      build = {}
    }
    try {
      workload = this.repoService.getTeamConfigService(teamId).getWorkload(project.workload!.id!)
    } catch (err) {
      workload = {}
    }
    try {
      workloadValues = this.repoService.getTeamConfigService(teamId).getWorkloadValues(project.workloadValues!.id!)
    } catch (err) {
      workloadValues = {}
    }
    try {
      services = this.repoService.getTeamConfigService(teamId).getService(project.service!.id!)
    } catch (err) {
      services = {}
    }
    return {
      id,
      teamId,
      ...project,
      name: project.name,
      build,
      workload,
      workloadValues,
      service: services,
    }
  }

  async editProject(teamId: string, id: string, data: Project): Promise<Project> {
    const { build, workload, workloadValues, service, name } = data

    let b, w, wv, s
    if (!build?.id && build?.mode) {
      b = this.repoService.getTeamConfigService(teamId).createBuild({ ...build, teamId })
    } else if (build?.id) {
      b = this.repoService.getTeamConfigService(teamId).updateBuild(build.id, build)
    }

    if (workload && !workload?.id) {
      w = this.repoService.getTeamConfigService(teamId).createWorkload(workload)
    } else if (workload?.id) {
      w = this.repoService.getTeamConfigService(teamId).updateWorkload(workload.id, workload)
    }

    if (workloadValues && !workloadValues?.id) {
      wv = this.repoService.getTeamConfigService(teamId).createWorkloadValues({ ...workloadValues, name })
    } else if (workloadValues?.id) {
      wv = this.repoService
        .getTeamConfigService(teamId)
        .updateWorkloadValues(workloadValues.id, { ...workloadValues, name })
    }

    if (service && !service?.id) {
      s = this.repoService.getTeamConfigService(teamId).createService({ ...service, teamId })
    } else if (service?.id) {
      s = this.repoService.getTeamConfigService(teamId).updateService(service.id, service)
    }

    const updatedData = {
      id,
      name,
      teamId,
      ...(b && { build: { id: b.id } }),
      workload: { id: w.id },
      workloadValues: { id: wv.id },
      service: { id: s.id },
    }

    let project: Project
    try {
      project = this.repoService.getTeamConfigService(teamId).createProject(updatedData)
    } catch (error) {
      if (error.code === 409) {
        project = this.repoService.getTeamConfigService(teamId).updateProject(id, updatedData)
      } else {
        throw error
      }
    }
    await this.saveTeamProject(teamId, data)
    await this.saveTeamBuild(teamId, b)
    await this.saveTeamWorkload(teamId, w)
    await this.saveTeamWorkloadValues(teamId, wv)
    await this.saveTeamService(teamId, s)
    await this.doDeployment(['projects', 'builds', 'workloads', 'workloadValues', 'services'], teamId)
    return project
  }

  // Deletes a project and all its related resources
  async deleteProject(teamId: string, id: string): Promise<void> {
    const p = this.repoService.getTeamConfigService(teamId).getProject(id)
    if (p.build?.id) {
      await this.deleteTeamBuild(teamId, p.build.id)
    }
    if (p.workload?.id) {
      await this.deleteTeamWorkload(teamId, p.workload.id)
    }
    if (p.workloadValues?.id) {
      await this.deleteTeamWorkloadValues(teamId, p.workloadValues.id)
    }
    if (p.service?.id) {
      await this.deleteTeamService(teamId, p.service.id)
    }
    await this.deleteTeamProject(teamId, id)
    await this.doDeployment(['projects', 'builds', 'workloads', 'workloadValues', 'services'], teamId)
  }

  getTeamCoderepos(teamId: string): Array<Coderepo> {
    return this.repoService.getTeamConfigService(teamId).getCoderepos()
  }

  getAllCoderepos(): Array<Coderepo> {
    const allCoderepos = this.repoService.getAllCoderepos()
    return allCoderepos
  }

  async createCoderepo(teamId: string, data: Coderepo): Promise<Coderepo> {
    try {
      const body = { ...data }
      if (!body.private) unset(body, 'secret')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const coderepo = this.repoService.getTeamConfigService(teamId).createCoderepo({ ...data, teamId })
      await this.saveTeamCoderepo(teamId, coderepo)
      await this.doDeployment(['coderepos'], teamId)
      return coderepo
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Code repo label already exists'
      throw err
    }
  }

  getCoderepo(teamId: string, id: string): Coderepo {
    return this.repoService.getTeamConfigService(teamId).getCoderepo(id)
  }

  async editCoderepo(teamId: string, id: string, data: Coderepo): Promise<Coderepo> {
    const body = { ...data }
    if (!body.private) unset(body, 'secret')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const coderepo = this.repoService.getTeamConfigService(teamId).updateCoderepo(id, body)
    await this.saveTeamCoderepo(teamId, coderepo)
    await this.doDeployment(['coderepos'], teamId)
    return coderepo
  }

  async deleteCoderepo(teamId: string, id: string): Promise<void> {
    await this.deleteTeamCoderepo(teamId, id)
    await this.doDeployment(['coderepos'], teamId)
  }

  async getTestRepoConnect(url: string, teamId: string, secretName: string): Promise<TestRepoConnect> {
    try {
      let sshPrivateKey = '',
        username = '',
        accessToken = ''

      if (secretName) {
        const secret = await getSecretValues(secretName, `team-${teamId}`)
        sshPrivateKey = secret?.['ssh-privatekey'] || ''
        username = secret?.username || ''
        accessToken = secret?.password || ''
      }

      const isPrivate = !!secretName
      const isSSH = !!sshPrivateKey
      const repoUrl = normalizeRepoUrl(url, isPrivate, isSSH)

      if (!repoUrl) return { status: 'failed' }

      if (isPrivate)
        return (await testPrivateRepoConnect(repoUrl, sshPrivateKey, username, accessToken)) as TestRepoConnect

      return (await testPublicRepoConnect(repoUrl)) as TestRepoConnect
    } catch (error) {
      return { status: 'failed' }
    }
  }

  async getInternalRepoUrls(teamId: string): Promise<string[]> {
    if (env.isDev || !teamId || teamId === 'admin') return []
    const { cluster, otomi } = this.getSettings(['cluster', 'otomi'])
    const gitea = this.getApp('gitea')
    const username = gitea?.values?.adminUsername as string
    const password = (gitea?.values?.adminPassword as string) || (otomi?.adminPassword as string)
    const orgName = `team-${teamId}`
    const domainSuffix = cluster?.domainSuffix
    const internalRepoUrls = (await getGiteaRepoUrls(username, password, orgName, domainSuffix)) || []
    return internalRepoUrls
  }

  getDashboard(teamId: string): Array<any> {
    const projects = this.repoService.getTeamConfigService(teamId).getProjects()
    const builds = this.repoService.getTeamConfigService(teamId).getBuilds()
    const workloads = this.repoService.getTeamConfigService(teamId).getWorkloads()
    const services = this.repoService.getTeamConfigService(teamId).getServices()
    const secrets = this.repoService.getTeamConfigService(teamId).getSealedSecrets()
    const netpols = this.repoService.getTeamConfigService(teamId).getNetpols()

    return [
      { name: 'projects', count: projects?.length },
      { name: 'builds', count: builds?.length },
      { name: 'workloads', count: workloads?.length },
      { name: 'services', count: services?.length },
      { name: 'sealed secrets', count: secrets?.length },
      { name: 'network policies', count: netpols?.length },
    ]
  }

  getTeamBuilds(teamId: string): Array<Build> {
    return this.repoService.getTeamConfigService(teamId).getBuilds()
  }

  getAllBuilds(): Array<Build> {
    return this.repoService.getAllBuilds()
  }

  async createBuild(teamId: string, data: Build): Promise<Build> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const build = this.repoService.getTeamConfigService(teamId).createBuild({ ...data, teamId })
      await this.saveTeamBuild(teamId, data)
      await this.doDeployment(['builds'], teamId)
      return build
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Build name already exists'
      throw err
    }
  }

  getBuild(teamId: string, id: string): Build {
    return this.repoService.getTeamConfigService(teamId).getBuild(id)
  }

  async editBuild(teamId: string, id: string, data: Build): Promise<Build> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const build = this.repoService.getTeamConfigService(teamId).updateBuild(id, data)
    await this.saveTeamBuild(teamId, build)
    await this.doDeployment(['builds'], teamId)
    return build
  }

  async deleteBuild(teamId: string, id: string): Promise<void> {
    const p = this.repoService.getTeamConfigService(teamId).getProjects()
    p.forEach((project: Project) => {
      if (project?.build?.id === id) {
        const updatedData = { ...project, build: undefined }
        this.repoService.getTeamConfigService(teamId).updateProject(project.id!, updatedData)
      }
    })
    await this.deleteTeamBuild(teamId, id)
    await this.doDeployment(['builds'], teamId)
  }

  getTeamPolicies(teamId: string): Policies {
    return this.repoService.getTeamConfigService(teamId).getPolicies()
  }

  getAllPolicies(): Record<string, Policies> {
    return this.repoService.getAllPolicies()
  }

  getPolicy(teamId: string, id: string): Policy {
    return this.repoService.getTeamConfigService(teamId).getPolicy(id)
  }

  async editPolicy(teamId: string, policyId: string, data: Policy): Promise<Policy> {
    const teamPolicies = this.getTeamPolicies(teamId)
    teamPolicies[policyId] = removeBlankAttributes(data)
    const policy = this.getPolicy(teamId, policyId)
    await this.saveTeamPolicies(teamId)
    await this.doDeployment(['policies'], teamId)
    return policy
  }

  async getK8sVersion(): Promise<string> {
    return (await getKubernetesVersion()) as string
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
    return this.repoService.getTeamConfigService(teamId).getWorkloads()
  }

  getAllWorkloads(): Array<Workload> {
    return this.repoService.getAllWorkloads()
  }

  async getWorkloadCatalog(data: { url: string; sub: string; teamId: string }): Promise<any> {
    const { url: clientUrl, sub, teamId } = data
    let url = clientUrl
    if (env?.HELM_CHART_CATALOG && !clientUrl) url = env.HELM_CHART_CATALOG
    if (!url) {
      throw {
        code: 404,
        message: 'No helm chart catalog found!',
      }
    }
    const version = env.VERSIONS.core as string
    const { helmCharts, catalog } = await fetchWorkloadCatalog(url, sub, teamId, version)
    return { url, helmCharts, catalog }
  }

  async createWorkload(teamId: string, data: Workload): Promise<Workload> {
    try {
      const workload = this.repoService.getTeamConfigService(teamId).createWorkload({ ...data, teamId })
      console.log('workload', workload.id)
      const workloadValues = this.repoService
        .getTeamConfigService(teamId)
        .createWorkloadValues({ teamId, values: {}, id: workload.id, name: workload.name })
      await this.saveTeamWorkload(teamId, data)
      await this.saveTeamWorkloadValues(teamId, workloadValues)
      await this.doDeployment(['workloads', 'workloadValues'], teamId)
      return workload
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Workload name already exists'
      throw err
    }
  }

  getWorkload(teamId: string, id: string): Workload {
    return this.repoService.getTeamConfigService(teamId).getWorkload(id)
  }

  async editWorkload(teamId: string, id: string, data: Workload): Promise<Workload> {
    const workload = this.repoService.getTeamConfigService(teamId).updateWorkload(id, data)
    await this.saveTeamWorkload(teamId, workload)
    await this.doDeployment(['workloads'], teamId)
    return workload
  }

  async deleteWorkload(teamId: string, id: string): Promise<void> {
    const p = this.repoService.getTeamConfigService(teamId).getProjects()
    p.forEach((project: Project) => {
      if (project?.workload?.id === id) {
        const updatedData = { ...project, workload: undefined, workloadValues: undefined }
        this.repoService.getTeamConfigService(teamId).updateProject(project.id!, updatedData)
      }
    })
    await this.deleteTeamWorkloadValues(teamId, id)
    await this.deleteTeamWorkload(teamId, id)
    await this.doDeployment(['workloads', 'workloadValues'], teamId)
  }

  async editWorkloadValues(teamId: string, id: string, data: WorkloadValues): Promise<WorkloadValues> {
    let workloadValues
    try {
      workloadValues = this.repoService.getTeamConfigService(teamId).createWorkloadValues({ ...data, id })
    } catch (error) {
      if (error.code === 409) {
        debug('Workload values already exists, updating values')
        workloadValues = this.repoService.getTeamConfigService(teamId).updateWorkloadValues(id, data)
      }
    }
    await this.saveTeamWorkloadValues(teamId, workloadValues)
    await this.doDeployment(['workloadValues'], teamId)
    return workloadValues
  }

  getWorkloadValues(teamId: string, id: string): WorkloadValues {
    return this.repoService.getTeamConfigService(teamId).getWorkloadValues(id)
  }

  getAllServices(): Array<Service> {
    return this.repoService.getAllServices()
  }

  async createService(teamId: string, data: Service): Promise<Service> {
    this.checkPublicUrlInUse(teamId, data)
    try {
      const service = this.repoService.getTeamConfigService(teamId).createService({ ...data, teamId })
      await this.saveTeamService(teamId, data)
      await this.doDeployment(['services'], teamId)
      return service
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Service name already exists'
      throw err
    }
  }

  getService(teamId: string, id: string): Service {
    return this.repoService.getTeamConfigService(teamId).getService(id)
  }

  async editService(teamId: string, id: string, data: Service): Promise<Service> {
    const service = this.repoService.getTeamConfigService(teamId).updateService(id, data)
    await this.saveTeamService(teamId, service)
    await this.doDeployment(['services'], teamId)
    return service
  }

  async deleteService(teamId: string, id: string, deleteProjectService = true): Promise<void> {
    if (deleteProjectService) {
      const p = this.repoService.getTeamConfigService(teamId).getProjects()
      p.forEach((project: Project) => {
        if (project?.service?.id === id) {
          const updatedData = { ...project, service: undefined }
          this.repoService.getTeamConfigService(teamId).updateProject(project.id!, updatedData)
        }
      })
    }
    await this.deleteTeamService(teamId, id)
    await this.doDeployment(['services'], teamId)
  }

  checkPublicUrlInUse(teamId: string, data: any): void {
    // skip when editing or when svc is of type "cluster" as it has no url
    if (data.id || data?.ingress?.type === 'cluster') return
    const newSvc = data.ingress
    const services = this.repoService.getTeamConfigService(teamId).getServices()

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

  async doDeployment(collectionIds?: string[], teamId?: string): Promise<void> {
    const rootStack = await getSessionStack()
    try {
      // Commit and push Git changes
      await this.git.save(this.editor!)

      if (collectionIds) {
        collectionIds.forEach((collectionId) => {
          if (teamId && collectionId in this.repoService.getRepo().teamConfig[teamId]) {
            // If a teamId is provided and collection is inside teamConfig, update the specific team
            const collection = this.repoService.getTeamConfigService(teamId).getCollection(collectionId)
            rootStack.repoService.getTeamConfigService(teamId).updateCollection(collectionId, collection)
          } else {
            // Otherwise, update the root repo collection
            console.log('collectionId', collectionId)
            const collection = this.repoService.getCollection(collectionId)
            if (collection) {
              rootStack.repoService.updateCollection(collectionId, collection)
            }
          }
        })
      }

      debug(`Updated root stack values with ${this.sessionId} changes`)

      // Clean up the session
      await cleanSession(this.sessionId!)

      // Emit pipeline status
      const sha = await rootStack.git.getCommitSha()
      this.emitPipelineStatus(sha)
    } catch (e) {
      if (e instanceof GitPullError) await this.doRestore()
      const msg: DbMessage = { editor: 'system', state: 'corrupt', reason: 'deploy' }
      getIo().emit('db', msg)
      throw e
    }
  }

  async doRestore(): Promise<void> {
    cleanAllSessions()
    await emptyDir(rootPath)
    // and re-init root
    const rootStack = await getSessionStack()
    await rootStack.initGit()
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
    if (env.isDev) return []
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
    return Buffer.from(secret.data!['.dockerconfigjson'], 'base64').toString('ascii')
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
      const encryptedData = Object.assign({}, ...(await Promise.all(encryptedDataPromises))) as EncryptedDataRecord[]
      const sealedSecret = this.repoService
        .getTeamConfigService(teamId)
        .createSealedSecret({ ...data, teamId, encryptedData, namespace })
      const sealedSecretChartValues = sealedSecretManifest(data, encryptedData, namespace)
      await this.saveTeamSealedSecrets(teamId, sealedSecretChartValues, sealedSecret.id!)
      await this.doDeployment(['sealedsecrets'], teamId)
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
    const encryptedData = Object.assign({}, ...(await Promise.all(encryptedDataPromises))) as EncryptedDataRecord[]
    const sealedSecret = this.repoService
      .getTeamConfigService(data.teamId!)
      .createSealedSecret({ ...data, encryptedData })
    const sealedSecretChartValues = sealedSecretManifest(data, encryptedData, namespace)
    await this.saveTeamSealedSecrets(data.teamId!, sealedSecretChartValues, id)
    await this.doDeployment(['sealedsecrets'], data.teamId)
    return sealedSecret
  }

  async deleteSealedSecret(teamId: string, id: string): Promise<void> {
    const sealedSecret = await this.getSealedSecret(teamId, id)
    this.repoService.getTeamConfigService(teamId).deleteSealedSecret(id)
    const relativePath = getTeamSealedSecretsValuesFilePath(sealedSecret.teamId!, `${id}.yaml`)
    await this.git.removeFile(relativePath)
    await this.doDeployment(['sealedsecrets'], teamId)
  }

  async getSealedSecret(teamId: string, id: string): Promise<SealedSecret> {
    const sealedSecret = this.repoService.getTeamConfigService(teamId).getSealedSecret(id)
    const namespace = sealedSecret.namespace ?? `team-${sealedSecret.teamId}`
    const secretValues = (await getSecretValues(sealedSecret.name, namespace)) || {}
    const isDisabled = isEmpty(secretValues)
    const encryptedData = Object.entries(sealedSecret.encryptedData).map(([key, value]) => ({
      key,
      value: secretValues?.[key] || value,
    }))
    return { ...sealedSecret, encryptedData, isDisabled } as any
  }

  getAllSealedSecrets(): Array<SealedSecret> {
    return this.repoService.getAllSealedSecrets()
  }

  getSealedSecrets(teamId: string): Array<SealedSecret> {
    return this.repoService.getTeamConfigService(teamId).getSealedSecrets()
  }

  async getSecretsFromK8s(teamId: string): Promise<Array<string>> {
    if (env.isDev) return []
    return await getTeamSecretsFromK8s(`team-${teamId}`)
  }

  async loadValues(): Promise<Promise<Promise<Promise<Promise<void>>>>> {
    debug('Loading values')
    await this.git.initSops()
    await this.initRepo()
    this.isLoaded = true
  }

  async saveAdminApps(app: App, secretPaths?: string[]): Promise<void> {
    const { id, enabled, values, rawValues } = app
    const apps = {
      [id]: {
        ...(values || {}),
      },
    }
    if (!isEmpty(rawValues)) {
      apps[id]._rawValues = rawValues
    }

    if (this.canToggleApp(id)) {
      apps[id].enabled = !!enabled
    } else {
      delete apps[id].enabled
    }

    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplApp')!
    await this.git.saveConfigWithSecrets({ apps }, secretPaths ?? this.getSecretPaths(), fileMap)
  }

  async saveSettings(secretPaths?: string[]): Promise<void> {
    const settings = cloneDeep(this.getSettings()) as Record<string, Record<string, any>>
    settings.otomi.nodeSelector = arrayToObject(settings.otomi.nodeSelector as [])
    const fileMaps = getFileMaps('').filter((fm) => fm.resourceDir === 'settings')!
    for (const fileMap of fileMaps) {
      await this.git.saveConfigWithSecrets(settings, secretPaths ?? this.getSecretPaths(), fileMap)
    }
  }

  async saveUser(user: User): Promise<void> {
    debug(`Saving user ${user.email}`)
    const users: User[] = []
    users.push(user)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplUser')!
    await this.git.saveSecretConfig({ users }, fileMap, false)
  }

  async deleteUserFile(user: User): Promise<void> {
    debug(`Deleting user ${user.email}`)
    this.repoService.deleteUser(user.id!)
    const users: User[] = []
    users.push(user)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplUser')!
    await this.git.deleteConfig({ users }, fileMap, 'secrets.')
  }

  async saveTeam(team: Team, secretPaths?: string[]): Promise<void> {
    debug(`Saving team ${team.name}`)
    const repo = this.createTeamConfigInRepo(team.name, 'settings', team)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamSettingSet')!
    await this.git.saveConfigWithSecrets(repo, secretPaths ?? this.getSecretPaths(), fileMap)
  }

  async deleteTeamConfig(name: string): Promise<void> {
    this.repoService.deleteTeamConfig(name)
    const teamDir = `env/teams/${name}`
    await this.git.removeDir(teamDir)
  }

  async saveTeamSealedSecrets(teamId: string, data: any, id: string): Promise<void> {
    const relativePath = getTeamSealedSecretsValuesFilePath(teamId, `${id}.yaml`)
    debug(`Saving sealed secrets of team: ${teamId}`)
    await this.git.writeFile(relativePath, data)
  }

  async deleteTeamSealedSecrets(teamId: string, id: string): Promise<void> {
    const sealedSecret = this.repoService.getTeamConfigService(teamId).getSealedSecret(id)
    this.repoService.getTeamConfigService(teamId).deleteSealedSecret(id)

    const repo = this.createTeamConfigInRepo(teamId, 'sealedSecrets', sealedSecret)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamSecret')!
    await this.git.deleteConfig(repo, fileMap)
  }

  async saveTeamBackup(teamId: string, backup: Backup): Promise<void> {
    debug(`Saving backup ${backup.name} for team ${teamId}`)
    const repo = this.createTeamConfigInRepo(teamId, 'backups', backup)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamBackup')!
    await this.git.saveConfig(repo, fileMap)
  }

  async deleteTeamBackup(teamId: string, id: string): Promise<void> {
    const backup = this.repoService.getTeamConfigService(teamId).getBackup(id)
    this.repoService.getTeamConfigService(teamId).deleteBackup(id)

    const repo = this.createTeamConfigInRepo(teamId, 'backups', backup)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamBackup')!
    await this.git.deleteConfig(repo, fileMap)
  }

  async saveTeamNetpols(teamId: string, netpol: Netpol): Promise<void> {
    debug(`Saving netpols ${netpol.name} for team ${teamId}`)
    const repo = this.createTeamConfigInRepo(teamId, 'netpols', netpol)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamNetworkControl')!
    await this.git.saveConfig(repo, fileMap)
  }

  async deleteTeamNetpol(teamId: string, id: string): Promise<void> {
    const netpol = this.repoService.getTeamConfigService(teamId).getNetpol(id)
    this.repoService.getTeamConfigService(teamId).deleteNetpol(id)

    const repo = this.createTeamConfigInRepo(teamId, 'netpols', netpol)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamNetworkControl')!
    await this.git.deleteConfig(repo, fileMap)
  }

  async saveTeamWorkload(teamId: string, workload: Workload): Promise<void> {
    debug(`Saving workload ${workload.name} for team ${teamId}`)
    const repo = this.createTeamConfigInRepo(teamId, 'workloads', workload)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamWorkload')!
    await this.git.saveConfig(repo, fileMap)
  }

  async deleteTeamWorkload(teamId: string, id: string): Promise<void> {
    const workload = this.repoService.getTeamConfigService(teamId).getWorkload(id)
    this.repoService.getTeamConfigService(teamId).deleteWorkload(id)

    const repo = this.createTeamConfigInRepo(teamId, 'workloads', workload)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamWorkload')!
    await this.git.deleteConfig(repo, fileMap)
  }

  async saveTeamProject(teamId: string, project: Project): Promise<void> {
    debug(`Saving project ${project.name} for team ${teamId}`)
    const repo = this.createTeamConfigInRepo(teamId, 'projects', project)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamProject')!
    await this.git.saveConfig(repo, fileMap)
  }

  async deleteTeamProject(teamId: string, id: string): Promise<void> {
    const project = this.repoService.getTeamConfigService(teamId).getProject(id)
    this.repoService.getTeamConfigService(teamId).deleteProject(id)

    const repo = this.createTeamConfigInRepo(teamId, 'projects', project)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamProject')!
    await this.git.deleteConfig(repo, fileMap)
  }

  async saveTeamBuild(teamId: string, build: Build): Promise<void> {
    debug(`Saving build ${build.name} for team ${teamId}`)
    const repo = this.createTeamConfigInRepo(teamId, 'builds', build)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamBuild')!
    await this.git.saveConfig(repo, fileMap)
  }

  async deleteTeamBuild(teamId: string, id: string): Promise<void> {
    const build = this.repoService.getTeamConfigService(teamId).getBuild(id)
    this.repoService.getTeamConfigService(teamId).deleteBuild(id)

    const repo = this.createTeamConfigInRepo(teamId, 'builds', build)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamBuild')!
    await this.git.deleteConfig(repo, fileMap)
  }

  async saveTeamCoderepo(teamId: string, coderepo: Coderepo): Promise<void> {
    debug(`Saving coderepo ${coderepo.label} for team ${teamId}`)
    const repo = this.createTeamConfigInRepo(teamId, 'coderepos', coderepo)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamCoderepo')!
    await this.git.saveConfig(repo, fileMap)
  }

  async deleteTeamCoderepo(teamId: string, id: string): Promise<void> {
    const coderepo = this.repoService.getTeamConfigService(teamId).getCoderepo(id)
    this.repoService.getTeamConfigService(teamId).deleteCoderepo(id)

    const repo = this.createTeamConfigInRepo(teamId, 'coderepos', coderepo)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamCoderepo')!
    await this.git.deleteConfig(repo, fileMap)
  }

  async saveTeamPolicies(teamId: string): Promise<void> {
    debug(`Saving team policies ${teamId}`)
    const policies = this.getTeamPolicies(teamId)

    const repo = this.createTeamConfigInRepo(teamId, 'policies', policies)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamPolicy')!
    await this.git.saveConfig(repo, fileMap)
  }

  async saveTeamWorkloadValues(teamId: string, workloadValues: WorkloadValues): Promise<void> {
    debug(`Saving workload values: ${workloadValues.id!} teamId: ${teamId} name: ${workloadValues.name}`)
    const data = this.getWorkloadValues(teamId, workloadValues.id!)
    const updatedWorkloadValues = cloneDeep(data) as Record<string, any>
    updatedWorkloadValues.values = stringifyYaml(data.values, undefined, 4)

    const repo = this.createTeamConfigInRepo(teamId, 'workloadValues', updatedWorkloadValues)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamWorkloadValues')!
    await this.git.saveConfig(repo, fileMap)
  }

  async deleteTeamWorkloadValues(teamId: string, id: string): Promise<void> {
    const workloadValues = this.repoService.getTeamConfigService(teamId).getWorkloadValues(id)
    this.repoService.getTeamConfigService(teamId).deleteWorkloadValues(id)

    const repo = this.createTeamConfigInRepo(teamId, 'workloadValues', workloadValues)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamWorkloadValues')!
    await this.git.deleteConfig(repo, fileMap)
  }

  async saveTeamService(teamId: string, service: Service): Promise<void> {
    debug(`Saving service: ${service.name} teamId: ${teamId}`)
    const repo = this.createTeamConfigInRepo(teamId, 'services', service)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamService')!
    await this.git.saveConfig(repo, fileMap)
  }

  async deleteTeamService(teamId: string, id: string): Promise<void> {
    const service = this.repoService.getTeamConfigService(teamId).getService(id)
    this.repoService.getTeamConfigService(teamId).deleteService(id)

    const repo = this.createTeamConfigInRepo(teamId, 'services', service)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamService')!
    await this.git.deleteConfig(repo, fileMap)
  }

  private createTeamConfigInRepo<T>(teamId: string, key: string, value: T): Record<string, any> {
    return {
      teamConfig: {
        [teamId]: {
          [key]: Array.isArray(value) ? value : [value],
        },
      },
    }
  }

  async getSession(user: k8s.User): Promise<Session> {
    const rootStack = await getSessionStack()
    const valuesSchema = await getValuesSchema()
    const currentSha = rootStack.git.commitSha
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
      corrupt: rootStack.git.corrupt,
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
