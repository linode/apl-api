/* eslint-disable class-methods-use-this */
import * as k8s from '@kubernetes/client-node'
import { V1ObjectReference } from '@kubernetes/client-node'
import Debug from 'debug'

import { getRegions, ObjectStorageKeyRegions } from '@linode/api-v4'
import { emptyDir, pathExists, unlink } from 'fs-extra'
import { readdir, readFile, writeFile } from 'fs/promises'
import { generate as generatePassword } from 'generate-password'
import { cloneDeep, filter, get, isArray, isEmpty, map, omit, pick, set, unset } from 'lodash'
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
import { arrayToObject, getServiceUrl, getValuesSchema, objectToArray, removeBlankAttributes } from 'src/utils'
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
import { loadValues } from './repo'
import { RepoService } from './services/RepoService'

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

export function getTeamSealedSecretsValuesRootPath(teamId: string): string {
  return `env/teams/${teamId}/sealedsecrets`
}
export function getTeamSealedSecretsValuesFilePath(teamId: string, sealedSecretsName: string): string {
  return `env/teams/${teamId}/sealedsecrets/${sealedSecretsName}`
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

  async initRepo(repoService?: RepoService): Promise<void> {
    if (repoService) {
      this.repoService = repoService
      return
    } else {
      const repo = (await loadValues(this.getRepoPath())) as Repo
      this.repoService = new RepoService(repo)
    }
  }

  async initGit(skipDbInflation = false): Promise<void> {
    await this.init()
    await this.initRepo()
    // every editor gets their own folder to detect conflicts upon deploy
    const path = this.getRepoPath()
    const branch = env.GIT_BRANCH
    const url = env.GIT_REPO_URL
    for (;;) {
      try {
        this.git = await getRepo(path, url, env.GIT_USER, env.GIT_EMAIL, env.GIT_PASSWORD, branch)
        await this.git.pull()
        if (await this.git.fileExists('env/cluster.yaml')) break
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
      this.repoService.getTeamConfigService(teamId).createApp(id, { enabled: true, values, rawValues: {}, teamId })
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
      const teamId = 'admin'
      this.repoService.getTeamConfigService(teamId).deleteApp(id)
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
    const secretPaths = this.getSecretPaths()
    await this.saveSettings(secretPaths)
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

  getApp(teamId: string, id: string): App | ExcludedApp {
    const app = this.repoService.getTeamConfigService(teamId).getApp(id) as App
    this.filterExcludedApp(app)

    if (teamId === 'admin') return app
    const adminApp = this.repoService.getTeamConfigService(teamId).getApp(id) as App
    return { ...cloneDeep(app), enabled: adminApp.enabled }
  }

  getApps(teamId: string, picks?: string[]): Array<App> {
    const apps = this.repoService.getTeamConfigService(teamId).getApps() as Array<App>
    const providerSpecificApps = this.filterExcludedApp(apps) as App[]

    if (teamId === 'admin') return providerSpecificApps

    let teamApps = providerSpecificApps.map((app: App) => {
      const adminApp = this.repoService.getTeamConfigService('admin').getApp(app.id) as App
      return { ...cloneDeep(app), enabled: adminApp.enabled }
    })

    if (!picks) return teamApps

    if (picks.includes('enabled')) {
      const adminApps = this.repoService.getTeamConfigService('admin').getApps() as Array<App>

      teamApps = adminApps.map((adminApp) => {
        const teamApp = teamApps.find((app) => app.id === adminApp.id)
        return teamApp || { id: adminApp.id, enabled: adminApp.enabled }
      })
    }

    return teamApps.map((app) => pick(app, picks)) as Array<App>
  }

  async editApp(teamId: string, id: string, data: App): Promise<App> {
    let app: App = this.repoService.getTeamConfigService(teamId).getApp(id)
    // Shallow merge, so only first level attributes can be replaced (values, rawValues, etc.)
    app = { ...app, ...data }
    this.repoService.getTeamConfigService(teamId).updateApp(id, app)
    const secretPaths = this.getSecretPaths()
    // also save admin apps
    await this.saveAdminApps(secretPaths)
    await this.doDeployment(['apps'])
    return this.repoService.getTeamConfigService(teamId).getApp(id) as App
  }

  canToggleApp(id: string): boolean {
    const app = getAppSchema(id)
    return app.properties!.enabled !== undefined
  }

  async toggleApps(teamId: string, ids: string[], enabled: boolean): Promise<void> {
    ids.map((id) => {
      // we might be given a dep that is only relevant to core, or
      // which is essential, so skip it
      const orig = this.repoService.getTeamConfigService(teamId).getApp(id) as App
      if (orig && this.canToggleApp(id)) this.repoService.getTeamConfigService(teamId).updateApp(id, { enabled })
    })
    const secretPaths = this.getSecretPaths()
    // also save admin apps
    await this.saveAdminApps(secretPaths)
    await this.doDeployment(['apps'])
  }

  async loadApp(appInstanceId: string): Promise<void> {
    const isIngressApp = appInstanceId.startsWith('ingress-nginx-')
    const appId = isIngressApp ? 'ingress-nginx' : appInstanceId
    const path = `env/apps/${appInstanceId}.yaml`
    const secretsPath = `env/apps/secrets.${appInstanceId}.yaml`
    const content = await this.git.loadConfig(path, secretsPath)
    let values = content?.apps?.[appInstanceId] ?? {}
    if (appInstanceId === 'ingress-nginx-platform') {
      const isIngressNginxPlatformAppExists = await this.git.fileExists(`env/apps/ingress-nginx-platform.yaml`)
      if (!isIngressNginxPlatformAppExists) {
        const defaultIngressNginxContent = await this.git.loadConfig(
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
    this.repoService.getTeamConfigService(teamId).createApp(appInstanceId, { enabled, values, rawValues, teamId })
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
    return this.repoService.getTeamConfigService(id).getSettings()
  }

  async createTeam(data: Team, deploy = true): Promise<Team> {
    const id = data.id || data.name

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

    const teamConfig = this.repoService.createTeamConfig(id, data)
    const team = teamConfig.settings
    const apps = getAppList()
    const core = this.getCore()
    apps.forEach((appId) => {
      const isShared = !!core.adminApps.find((a) => a.name === appId)?.isShared
      const inTeamApps = !!core.teamApps.find((a) => a.name === appId)
      // Admin apps are loaded by loadApps function
      if (id !== 'admin' && (isShared || inTeamApps)) this.repoService.getTeamConfigService(id).createApp(appId, {})
    })

    if (!data.id) {
      const policies = getPolicies()
      this.repoService.getTeamConfigService(id).updatePolicies(policies)
    }
    if (deploy) {
      const secretPaths = this.getSecretPaths()
      await this.saveTeams(secretPaths)
      await this.doDeployment(['settings'], id)
    }
    return team
  }

  async editTeam(id: string, data: Team): Promise<Team> {
    const team = this.repoService.getTeamConfigService(id).updateSettings(data)
    const secretPaths = this.getSecretPaths()
    await this.saveTeams(secretPaths)
    await this.doDeployment(['settings'], id)
    return team
  }

  async deleteTeam(id: string): Promise<void> {
    this.repoService.deleteTeamConfig(id)
    const secretPaths = this.getSecretPaths()
    await this.saveTeams(secretPaths)
    await this.doDeployment(['teamConfig'])
  }

  getTeamServices(teamId: string): Array<Service> {
    return this.repoService.getTeamConfigService(teamId).getServices()
  }

  getTeamBackups(teamId: string): Array<Backup> {
    return this.repoService.getTeamConfigService(teamId).getBackups()
  }

  getAllBackups(): Array<Backup> {
    return this.repoService.getPlatformBackups()
  }

  async createBackup(teamId: string, data: Backup): Promise<Backup> {
    validateBackupFields(data.name, data.ttl)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const backup = this.repoService.getTeamConfigService(teamId).createBackup(data)

      await this.saveTeamBackups(teamId)
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

  async editBackup(id: string, data: Backup): Promise<Backup> {
    validateBackupFields(data.name, data.ttl)
    const backup = this.repoService.getTeamConfigService(data.teamId!).updateBackup(id, data)
    await this.saveTeamBackups(data.teamId!)
    await this.doDeployment(['backups'], data.teamId)
    return backup
  }

  async deleteBackup(teamId: string, id: string): Promise<void> {
    this.repoService.getTeamConfigService(teamId).deleteBackup(id)
    await this.saveTeamBackups(teamId)
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
      await this.saveTeamNetpols(teamId)
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

  async editNetpol(id: string, data: Netpol): Promise<Netpol> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const netpol = this.repoService.getTeamConfigService(data.teamId!).updateNetpol(id, data)
    await this.saveTeamNetpols(netpol.teamId!)
    await this.doDeployment(['netpols'], data.teamId)
    return netpol
  }

  async deleteNetpol(teamId: string, id: string): Promise<void> {
    this.repoService.getTeamConfigService(teamId).deleteNetpol(id)
    await this.saveTeamNetpols(teamId)
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
      const err = new HttpError(400, error as string)
      throw err
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
      const keycloak = this.getApp('admin', 'keycloak')
      const keycloakBaseUrl = `https://keycloak.${cluster?.domainSuffix}`
      const realm = 'otomi'
      const username = keycloak?.values?.adminUsername as string
      const password = otomi?.adminPassword as string
      existingUsersEmail = await getKeycloakUsers(keycloakBaseUrl, realm, username, password)
    }
    try {
      if (existingUsersEmail.some((existingUser) => existingUser === user.email))
        throw new AlreadyExists('User email already exists')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const createdUser = this.repoService.createUser(user)
      await this.saveUsers()
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
    await this.saveUsers()
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
    this.repoService.deleteUser(id)
    await this.saveUsers()
    await this.doDeployment(['users'])
  }

  async editTeamUsers(
    data: Pick<User, 'id' | 'email' | 'isPlatformAdmin' | 'isTeamAdmin' | 'teams'>[],
  ): Promise<Array<User>> {
    data.forEach((user) => {
      const existingUser = this.repoService.getUser(user.id!)
      this.repoService.updateUser(user.id!, { ...existingUser, teams: user.teams })
    })
    const users = this.repoService.getUsers()
    await this.saveUsers()
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
      await this.saveTeamProjects(teamId)
      await this.saveTeamBuilds(teamId)
      await this.saveTeamWorkloads(teamId)
      await this.saveTeamServices(teamId)
      await this.doDeployment(['projects', 'builds', 'workloads', 'workloadValues', 'services'], teamId)
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
    const { values } = workloadValues as WorkloadValues

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

    if (!data.workloadValues?.id) {
      wv = this.repoService.getTeamConfigService(teamId).createWorkloadValues({ teamId, values })
    } else if (workloadValues?.id) {
      wv = this.repoService.getTeamConfigService(teamId).updateWorkloadValues(workloadValues.id, { teamId, values })
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const project = this.repoService.getTeamConfigService(teamId).updateProject(id, updatedData)
    await this.saveTeamProjects(teamId)
    await this.saveTeamBuilds(teamId)
    await this.saveTeamWorkloads(teamId)
    await this.saveTeamServices(teamId)
    await this.doDeployment(['projects', 'builds', 'workloads', 'workloadValues', 'services'], teamId)
    return project
  }

  // Deletes a project and all its related resources
  async deleteProject(teamId: string, id: string): Promise<void> {
    const p = this.repoService.getTeamConfigService(teamId).getProject(id)
    if (p.build?.id) this.repoService.getTeamConfigService(teamId).deleteBuild(p.build.id)
    if (p.workload?.id) this.repoService.getTeamConfigService(teamId).deleteWorkload(p.workload.id)
    if (p.workloadValues?.id) this.repoService.getTeamConfigService(teamId).deleteWorkloadValues(p.workloadValues.id)
    if (p.service?.id) this.repoService.getTeamConfigService(teamId).deleteService(p.service.id)
    this.repoService.getTeamConfigService(teamId).deleteProject(id)
    await this.saveTeamProjects(teamId)
    await this.saveTeamBuilds(teamId)
    await this.saveTeamWorkloads(teamId)
    await this.saveTeamServices(teamId)
    await this.doDeployment(['projects', 'builds', 'workloads', 'workloadValues', 'services'], teamId)
  }

  getTeamCoderepos(teamId: string): Array<Coderepo> {
    const ids = { teamId }
    return this.db.getCollection('coderepos', ids) as Array<Coderepo>
  }

  getAllCoderepos(): Array<Coderepo> {
    const allCoderepos = this.db.getCollection('coderepos') as Array<Coderepo>
    return allCoderepos
  }

  async createCoderepo(teamId: string, data: Coderepo): Promise<Coderepo> {
    try {
      const body = { ...data }
      if (!body.private) unset(body, 'secret')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const coderepo = this.db.createItem('coderepos', { ...body, teamId }, { teamId, label: body.label }) as Coderepo
      await this.saveTeamCoderepos(teamId)
      await this.doDeployment(['coderepos'])
      return coderepo
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Code repe label already exists'
      throw err
    }
  }

  getCoderepo(id: string): Coderepo {
    return this.db.getItem('coderepos', { id }) as Coderepo
  }

  async editCoderepo(id: string, data: Coderepo): Promise<Coderepo> {
    const body = { ...data }
    if (!body.private) unset(body, 'secret')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const coderepo = this.db.updateItem('coderepos', body, { id }) as Coderepo
    await this.saveTeamCoderepos(coderepo.teamId as string)
    await this.doDeployment(['coderepos'])
    return coderepo
  }

  async deleteCoderepo(id: string): Promise<void> {
    const coderepo = this.getCoderepo(id)
    this.db.deleteItem('coderepos', { id })
    await this.saveTeamCoderepos(coderepo.teamId as string)
    await this.doDeployment(['coderepos'])
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
    const gitea = this.getApp('admin', 'gitea')
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
      await this.saveTeamBuilds(teamId)
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

  async editBuild(id: string, data: Build): Promise<Build> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const build = this.repoService.getTeamConfigService(data.teamId!).updateBuild(id, data)
    await this.saveTeamBuilds(build.teamId!)
    await this.doDeployment(['builds'], data.teamId)
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
    this.repoService.getTeamConfigService(teamId).deleteBuild(id)
    await this.saveTeamBuilds(teamId)
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
      const workload = this.repoService.getTeamConfigService(teamId).createWorkload({ ...data, teamId })
      this.repoService.getTeamConfigService(teamId).createWorkloadValues({ teamId, values: {}, id: workload.id })
      await this.saveTeamWorkloads(teamId)
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

  async editWorkload(id: string, data: Workload): Promise<Workload> {
    const workload = this.repoService.getTeamConfigService(data.teamId!).updateWorkload(id, data)
    await this.saveTeamWorkloads(workload.teamId!)
    await this.doDeployment(['workloads', 'workloadValues'], data.teamId)
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
    const workloadValues = this.repoService.getTeamConfigService(teamId).getWorkloadValues(id)
    const path = getTeamWorkloadValuesFilePath(workloadValues.teamId!, workloadValues.name)
    await this.git.removeFile(path)
    this.repoService.getTeamConfigService(teamId).deleteWorkloadValues(id)
    this.repoService.getTeamConfigService(teamId).deleteWorkload(id)
    await this.saveTeamWorkloads(workloadValues.teamId!)
    await this.doDeployment(['workloads', 'workloadValues'], teamId)
  }

  async editWorkloadValues(id: string, data: WorkloadValues): Promise<WorkloadValues> {
    const workloadValues = this.repoService.getTeamConfigService(data.teamId!).updateWorkloadValues(id, data)
    await this.saveTeamWorkloads(workloadValues.teamId!)
    await this.doDeployment(['workloadValues'], workloadValues.teamId)
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
      await this.saveTeamServices(teamId)
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

  async editService(id: string, data: Service): Promise<Service> {
    const service = this.repoService.getTeamConfigService(data.teamId!).updateService(id, data)
    await this.saveTeamServices(service.teamId!)
    await this.doDeployment(['services'], data.teamId)
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
    this.repoService.getTeamConfigService(teamId).deleteService(id)
    await this.saveTeamServices(teamId)
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
    const token = Buffer.from(secret.data!['.dockerconfigjson'], 'base64').toString('ascii')
    return token
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
      const encryptedData = Object.assign({}, ...(await Promise.all(encryptedDataPromises))) as EncryptedDataRecord
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
    const encryptedData = Object.assign({}, ...(await Promise.all(encryptedDataPromises))) as EncryptedDataRecord
    const sealedSecret = this.db.updateItem('sealedsecrets', { ...data, encryptedData }, { id }) as SealedSecret
    const sealedSecretChartValues = sealedSecretManifest(data, encryptedData, namespace)
    await this.saveTeamSealedSecrets(data.teamId!, sealedSecretChartValues, id)
    await this.doDeployment(['sealedsecrets'])
    return sealedSecret
  }

  async deleteSealedSecret(id: string): Promise<void> {
    const sealedSecret = await this.getSealedSecret(id)
    this.db.deleteItem('sealedsecrets', { id })
    const relativePath = getTeamSealedSecretsValuesFilePath(sealedSecret.teamId!, `${id}.yaml`)
    await this.repo.removeFile(relativePath)
    await this.doDeployment(['sealedsecrets'])
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
    const res = { ...sealedSecret, encryptedData, isDisabled } as any
    return res
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
    await this.loadCluster()
    await this.loadSettings()
    await this.loadUsers()
    await this.loadTeams()
    await this.loadApps()
    this.isLoaded = true
  }

  async loadCluster(): Promise<void> {
    const { cluster } = await this.git.loadConfig('env/cluster.yaml', 'env/secrets.cluster.yaml')
    this.repoService.updateCluster(cluster)
  }

  async loadSettings(): Promise<void> {
    const data: Record<string, any> = await this.git.loadConfig('env/settings.yaml', `env/secrets.settings.yaml`)

    if (data.otomi) {
      data.otomi.nodeSelector = objectToArray((data.otomi.nodeSelector ?? {}) as Record<string, any>)
    }

    this.repoService.updateSettings(data)
  }

  async loadUsers(): Promise<void> {
    const { secretFilePostfix } = this.git
    const relativePath = `env/secrets.users.yaml`
    const secretRelativePath = `${relativePath}${secretFilePostfix}`
    if (!(await this.git.fileExists(relativePath)) || !(await this.git.fileExists(secretRelativePath))) {
      debug(`No users found`)
      return
    }
    const data = await this.git.readFile(secretRelativePath)
    const inData: Array<User> = get(data, `users`, [])
    inData.forEach((inUser) => {
      const user = this.repoService.createUser(inUser)
      debug(`Loaded user: email: ${user.email}, id: ${user.id}`)
    })
  }

  async loadTeamSealedSecrets(teamId: string): Promise<void> {
    const sealedSecretsValuesRootPath = getTeamSealedSecretsValuesRootPath(teamId)
    const sealedSecretsFileNames = await this.repo.readDir(sealedSecretsValuesRootPath)
    if (sealedSecretsFileNames.length === 0) return

    await Promise.all(
      sealedSecretsFileNames.map(async (id: string) => {
        const relativePath = getTeamSealedSecretsValuesFilePath(teamId, id)
        if (!(await this.repo.fileExists(relativePath))) {
          debug(`Team ${teamId} has no sealed secrets yet`)
          return
        }
        const data = await this.repo.readFile(relativePath)
        const res: any = this.db.populateItem(
          'sealedsecrets',
          {
            encryptedData: data.spec.encryptedData,
            metadata: data.spec.template.metadata,
            type: data.spec.template.type,
            name: data.metadata.name,
            teamId,
          },
          undefined,
          id.replace('.yaml', ''),
        )
        debug(`Loaded sealed secret: name: ${res.name}, id: ${res.id}, teamId: ${res.teamId}`)
      }),
    )
  }

  async loadTeamBackups(teamId: string): Promise<void> {
    const relativePath = getTeamBackupsFilePath(teamId)
    if (!(await this.git.fileExists(relativePath))) {
      debug(`Team ${teamId} has no backups yet`)
      return
    }
    const data = await this.git.readFile(relativePath)
    const inData: Array<Backup> = get(data, getTeamBackupsJsonPath(teamId), [])
    inData.forEach((inBackup) => {
      const backup = this.repoService.getTeamConfigService(teamId).createBackup({ ...inBackup, teamId })
      debug(`Loaded backup: name: ${backup.name}, id: ${backup.id}, teamId: ${backup.teamId}`)
    })
  }

  async loadTeamNetpols(teamId: string): Promise<void> {
    const relativePath = getTeamNetpolsFilePath(teamId)
    if (!(await this.git.fileExists(relativePath))) {
      debug(`Team ${teamId} has no network policies yet`)
      return
    }
    const data = await this.git.readFile(relativePath)
    const inData: Array<Netpol> = get(data, getTeamNetpolsJsonPath(teamId), [])
    inData.forEach((inNetpol) => {
      const netpol = this.repoService.getTeamConfigService(teamId).createNetpol({ ...inNetpol, teamId })
      debug(`Loaded network policy: name: ${netpol.name}, id: ${netpol.id}, teamId: ${netpol.teamId}`)
    })
  }

  async loadTeamProjects(teamId: string): Promise<void> {
    const relativePath = getTeamProjectsFilePath(teamId)
    if (!(await this.git.fileExists(relativePath))) {
      debug(`Team ${teamId} has no projects yet`)
      return
    }
    const data = await this.git.readFile(relativePath)
    const inData: Array<Project> = get(data, getTeamProjectsJsonPath(teamId), [])
    inData.forEach((inProject) => {
      const project = this.repoService.getTeamConfigService(teamId).createProject({ ...inProject, teamId })
      debug(`Loaded project: name: ${project.name}, id: ${project.id}, teamId: ${project.teamId}`)
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
    if (!(await this.git.fileExists(relativePath))) {
      debug(`Team ${teamId} has no builds yet`)
      return
    }
    const data = await this.git.readFile(relativePath)
    const inData: Array<Build> = get(data, getTeamBuildsJsonPath(teamId), [])
    inData.forEach((inBuild) => {
      const build = this.repoService.getTeamConfigService(teamId).createBuild({ ...inBuild, teamId })
      debug(`Loaded build: name: ${build.name}, id: ${build.id}, teamId: ${build.teamId}`)
    })
  }

  async loadTeamPolicies(teamId: string): Promise<void> {
    const relativePath = getTeamPoliciesFilePath(teamId)
    if (!(await this.git.fileExists(relativePath))) {
      debug(`Team ${teamId} has no policies yet`)
      return
    }
    const data = await this.git.readFile(relativePath)
    const inData: Partial<Policies> = get(data, getTeamPoliciesJsonPath(teamId), {})
    this.repoService.getTeamConfigService(teamId).updatePolicies(inData)
    debug(`Loaded policies of team: ${teamId}`)
  }

  async loadTeamWorkloads(teamId: string): Promise<void> {
    const relativePath = getTeamWorkloadsFilePath(teamId)
    if (!(await this.git.fileExists(relativePath))) {
      debug(`Team ${teamId} has no workloads yet`)
      return
    }
    const data = await this.git.readFile(relativePath)
    const inData: Array<Workload> = get(data, getTeamWorkloadsJsonPath(teamId), [])
    inData.forEach((inWorkload) => {
      const workload = this.repoService.getTeamConfigService(teamId).createWorkload({ ...inWorkload, teamId })
      debug(`Loaded workload: name: ${workload.name}, id: ${workload.id}, teamId: ${workload.teamId}`)
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
    let data = { values: {} } as WorkloadValues
    if (!(await this.git.fileExists(relativePath))) debug(`The workload values file does not exists at ${relativePath}`)
    else {
      const fileData = await this.git.readFile(relativePath)
      data = { ...data, ...fileData }
    }

    data.id = workload.id!
    data.teamId = workload.teamId!
    data.name = workload.name!
    try {
      data.values = parseYaml(data.values as unknown as string) || {}
    } catch (error) {
      debug(
        `The values property does not seem to be a YAML formated string at ${relativePath}. Falling back to empty map.`,
      )
      data.values = {}
    }

    const res = this.repoService.getTeamConfigService(workload.teamId!).createWorkloadValues(data)
    debug(`Loaded workload values: name: ${res.name} id: ${res.id}, teamId: ${workload.teamId!}`)
    return res
  }

  async loadTeams(): Promise<void> {
    const mergedData: Core = await this.git.loadConfig('env/teams.yaml', `env/secrets.teams.yaml`)
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
    if (!(await this.git.fileExists(relativePath))) {
      debug(`Team ${teamId} has no services yet`)
      return
    }
    const data = await this.git.readFile(relativePath)
    const services = get(data, getTeamServicesJsonPath(teamId), [])
    services.forEach((svc) => {
      this.loadService(svc, teamId)
    })
  }

  async saveCluster(secretPaths?: string[]): Promise<void> {
    await this.git.saveConfig(
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

        await this.git.saveConfig(
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
    await this.git.saveConfig(
      'env/settings.yaml',
      `env/secrets.settings.yaml`,
      omit(settings, ['cluster']),
      secretPaths ?? this.getSecretPaths(),
    )
  }

  async saveUsers(): Promise<void> {
    const users = this.repoService.getUsers()
    const relativePath = `env/secrets.users.yaml`
    const { secretFilePostfix } = this.git
    let secretRelativePath = `${relativePath}${secretFilePostfix}`
    if (secretFilePostfix) {
      const secretExists = await this.git.fileExists(relativePath)
      if (!secretExists) secretRelativePath = relativePath
    }
    const outData: Record<string, any> = set({}, `users`, users)
    debug(`Saving users`)
    await this.git.writeFile(secretRelativePath, outData, false)
    if (users.length === 0) {
      await this.git.removeFile(relativePath)
      await this.git.removeFile(secretRelativePath)
    }
  }

  async saveTeams(secretPaths?: string[]): Promise<void> {
    const filePath = 'env/teams.yaml'
    const secretFilePath = `env/secrets.teams.yaml`
    const teamValues = {}
    const teams = this.getTeams()
    await Promise.all(
      teams.map((inTeam) => {
        const team: Record<string, any> = omit(inTeam, 'name')
        const teamId = team.id as string
        team.resourceQuota = arrayToObject((team.resourceQuota as []) ?? [])
        teamValues[teamId] = team
      }),
    )
    const values = set({}, 'teamConfig', teamValues)
    await this.git.saveConfig(filePath, secretFilePath, values, secretPaths ?? this.getSecretPaths())
  }

  async saveTeamSealedSecrets(teamId: string, data: any, id: string): Promise<void> {
    const relativePath = getTeamSealedSecretsValuesFilePath(teamId, `${id}.yaml`)
    debug(`Saving sealed secrets of team: ${teamId}`)
    await this.repo.writeFile(relativePath, data)
  }

  async saveTeamBackups(teamId: string): Promise<void> {
    const backups = this.repoService.getTeamConfigService(teamId).getBackups()
    const cleaneBackups: Array<Record<string, any>> = backups.map((obj) => {
      return omit(obj, ['teamId'])
    })
    const relativePath = getTeamBackupsFilePath(teamId)
    const outData: Record<string, any> = set({}, getTeamBackupsJsonPath(teamId), cleaneBackups)
    debug(`Saving backups of team: ${teamId}`)
    await this.git.writeFile(relativePath, outData)
  }

  async saveTeamNetpols(teamId: string): Promise<void> {
    const netpols = this.repoService.getTeamConfigService(teamId).getNetpols()
    const cleaneNetpols: Array<Record<string, any>> = netpols.map((obj) => {
      return omit(obj, ['teamId'])
    })
    const relativePath = getTeamNetpolsFilePath(teamId)
    const outData: Record<string, any> = set({}, getTeamNetpolsJsonPath(teamId), cleaneNetpols)
    debug(`Saving network policies of team: ${teamId}`)
    await this.git.writeFile(relativePath, outData)
  }

  async saveTeamWorkloads(teamId: string): Promise<void> {
    const workloads = this.repoService.getTeamConfigService(teamId).getWorkloads()
    const cleaneWorkloads: Array<Record<string, any>> = workloads.map((obj) => {
      return omit(obj, ['teamId'])
    })
    const relativePath = getTeamWorkloadsFilePath(teamId)
    const outData: Record<string, any> = set({}, getTeamWorkloadsJsonPath(teamId), cleaneWorkloads)
    debug(`Saving workloads of team: ${teamId}`)
    await this.git.writeFile(relativePath, outData)
    await Promise.all(
      workloads.map((workload) => {
        this.saveWorkloadValues(teamId, workload)
      }),
    )
  }

  async saveTeamProjects(teamId: string): Promise<void> {
    const projects = this.repoService.getTeamConfigService(teamId).getProjects()
    const cleaneProjects: Array<Record<string, any>> = projects.map((obj) => {
      return omit(obj, ['teamId'])
    })
    const relativePath = getTeamProjectsFilePath(teamId)
    const outData: Record<string, any> = set({}, getTeamProjectsJsonPath(teamId), cleaneProjects)
    debug(`Saving projects of team: ${teamId}`)
    await this.git.writeFile(relativePath, outData)
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
    const builds = this.repoService.getTeamConfigService(teamId).getBuilds()
    const cleaneBuilds: Array<Record<string, any>> = builds.map((obj) => {
      return omit(obj, ['teamId'])
    })
    const relativePath = getTeamBuildsFilePath(teamId)
    const outData: Record<string, any> = set({}, getTeamBuildsJsonPath(teamId), cleaneBuilds)
    debug(`Saving builds of team: ${teamId}`)
    await this.git.writeFile(relativePath, outData)
  }

  async saveTeamPolicies(teamId: string): Promise<void> {
    const policies = this.getTeamPolicies(teamId)
    const relativePath = getTeamPoliciesFilePath(teamId)
    const outData: Record<string, Policies> = set({}, getTeamPoliciesJsonPath(teamId), policies)
    debug(`Saving policies of team: ${teamId}`)
    await this.git.writeFile(relativePath, outData)
  }

  async saveWorkloadValues(teamId: string, workload: Workload): Promise<void> {
    debug(`Saving workload values: id: ${workload.id!} teamId: ${teamId} name: ${workload.name}`)
    const data = this.getWorkloadValues(teamId, workload.id!)
    const outData = omit(data, ['id', 'teamId', 'name']) as Record<string, any>
    outData.values = stringifyYaml(data.values, undefined, 4)
    const path = getTeamWorkloadValuesFilePath(teamId, workload.name)

    await this.git.writeFile(path, outData, false)
  }

  async saveTeamServices(teamId: string): Promise<void> {
    const services = this.repoService.getTeamConfigService(teamId).getServices()
    const data = {}
    const values: any[] = []
    services.forEach((service) => {
      const value = this.convertDbServiceToValues(service)
      values.push(value)
    })

    set(data, getTeamServicesJsonPath(teamId), values)
    const filePath = getTeamServicesFilePath(teamId)
    await this.git.writeFile(filePath, data)
  }

  async loadTeam(inTeam: Team): Promise<void> {
    const team = { ...inTeam, name: inTeam.id } as Record<string, any>
    team.resourceQuota = objectToArray(inTeam.resourceQuota as Record<string, any>)
    const res = await this.createTeam(team as Team, false)
    // const res: any = this.db.populateItem('teams', { ...team, name: team.id! }, undefined, team.id as string)
    debug(`Loaded team: ${res.id!}`)
  }

  loadService(svcRaw, teamId: string): void {
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
    svc.name = svcRaw.name as string
    if (!('name' in svcRaw)) debug('Unknown service structure')
    if (svcRaw.type === 'cluster') svc.ingress = { type: 'cluster' }
    else {
      const { cluster, dns } = this.getSettings(['cluster', 'dns'])
      const url = getServiceUrl({ domain: svcRaw.domain, name: svcRaw.name, teamId, cluster, dns })
      // TODO remove the isArray check in 0.5.24
      const headers = isArray(svcRaw.headers) ? undefined : svcRaw.headers
      svc.ingress = {
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

    const res: any = this.repoService.getTeamConfigService(teamId).createService(<Service>removeBlankAttributes(svc))
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
