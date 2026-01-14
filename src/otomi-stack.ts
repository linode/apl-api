import { CoreV1Api, KubeConfig, User as k8sUser, V1ObjectReference } from '@kubernetes/client-node'
import Debug from 'debug'

import { getRegions, ObjectStorageKeyRegions } from '@linode/api-v4'
import { existsSync, rmSync } from 'fs'
import { pathExists, unlink } from 'fs-extra'
import { readdir, readFile, writeFile } from 'fs/promises'
import { generate as generatePassword } from 'generate-password'
import { cloneDeep, filter, get, isEmpty, map, merge, omit, pick, set, unset } from 'lodash'
import { getAppList, getAppSchema, getSecretPaths } from 'src/app'
import {
  AlreadyExists,
  ForbiddenError,
  HttpError,
  NotExistError,
  OtomiError,
  PublicUrlExists,
  ValidationError,
} from 'src/error'
import { getSettingsFileMaps } from 'src/fileStore/file-map'
import { FileStore } from 'src/fileStore/file-store'
import getRepo, { getWorktreeRepo, Git } from 'src/git'
import { cleanSession, getSessionStack } from 'src/middleware'
import {
  AplAgentRequest,
  AplAgentResponse,
  AplAIModelResponse,
  AplBuildRequest,
  AplBuildResponse,
  AplCodeRepoRequest,
  AplCodeRepoResponse,
  AplKind,
  AplKnowledgeBaseRequest,
  AplKnowledgeBaseResponse,
  AplNetpolRequest,
  AplNetpolResponse,
  AplObject,
  AplPlatformObject,
  AplPolicyRequest,
  AplPolicyResponse,
  AplRecord,
  AplSecretRequest,
  AplSecretResponse,
  AplServiceRequest,
  AplServiceResponse,
  AplTeamObject,
  AplTeamSettingsRequest,
  AplTeamSettingsResponse,
  AplWorkloadRequest,
  AplWorkloadResponse,
  App,
  Build,
  buildPlatformObject,
  buildTeamObject,
  Cloudtty,
  CodeRepo,
  Core,
  DeepPartial,
  K8sService,
  Netpol,
  ObjWizard,
  Policies,
  Policy,
  SealedSecret,
  Service,
  ServiceSpec,
  Session,
  SessionUser,
  Settings,
  SettingsInfo,
  Team,
  TeamSelfService,
  TestRepoConnect,
  toPlatformObject,
  toTeamObject,
  User,
  Workload,
  WorkloadName,
  WorkloadValues,
} from 'src/otomi-models'
import {
  arrayToObject,
  getSanitizedErrorMessage,
  getServiceUrl,
  getValuesSchema,
  removeBlankAttributes,
} from 'src/utils'
import { deepQuote } from 'src/utils/yamlUtils'
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
  HIDDEN_APPS,
  KNOWLEDGE_BASE_KIND,
  OBJ_STORAGE_APPS,
  PREINSTALLED_EXCLUDED_APPS,
  TOOLS_HOST,
  VERSIONS,
} from 'src/validators'
import { v4 as uuidv4 } from 'uuid'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { getAIModels } from './ai/aiModelHandler'
import { DatabaseCR } from './ai/DatabaseCR'
import { getResourceFilePath, getSecretFilePath } from './fileStore/file-map'
import {
  apply,
  checkPodExists,
  getCloudttyActiveTime,
  getKubernetesVersion,
  getSecretValues,
  getTeamSecretsFromK8s,
  k8sdelete,
  watchPodUntilRunning,
} from './k8s_operations'
import {
  getGiteaRepoUrls,
  getPrivateRepoBranches,
  getPublicRepoBranches,
  normalizeRepoUrl,
  testPrivateRepoConnect,
  testPublicRepoConnect,
} from './utils/codeRepoUtils'
import { getAplObjectFromV1, getV1MergeObject, getV1ObjectFromApl } from './utils/manifests'
import {
  getSealedSecretsPEM,
  sealedSecretManifest,
  SealedSecretManifestType,
  toSealedSecretResponse,
} from './utils/sealedSecretUtils'
import { getKeycloakUsers, isValidUsername } from './utils/userUtils'
import { defineClusterId, ObjectStorageClient } from './utils/wizardUtils'
import {
  fetchChartYaml,
  fetchWorkloadCatalog,
  isInteralGiteaURL,
  NewHelmChartValues,
  sparseCloneChart,
} from './utils/workloadUtils'
import { listAkamaiAgentCRs, listAkamaiKnowledgeBaseCRs } from './ai/k8s'
import { AkamaiAgentCR } from './ai/AkamaiAgentCR'
import { AkamaiKnowledgeBaseCR } from './ai/AkamaiKnowledgeBaseCR'

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
  HIDDEN_APPS,
  OBJ_STORAGE_APPS,
  KNOWLEDGE_BASE_KIND,
})

export const rootPath = '/tmp/otomi/values'
const clusterSettingsFilePath = 'env/settings/cluster.yaml'

function getTeamSealedSecretsValuesFilePath(teamId: string, sealedSecretsName: string): string {
  return `env/teams/${teamId}/sealedsecrets/${sealedSecretsName}.yaml`
}

function getTeamWorkloadValuesManagedFilePath(teamId: string, workloadName: string): string {
  return `env/teams/${teamId}/workloadValues/${workloadName}.managed.yaml`
}

function getTeamWorkloadValuesFilePath(teamId: string, workloadName: string): string {
  return `env/teams/${teamId}/workloadValues/${workloadName}.yaml`
}

function getTeamKnowledgeBaseValuesFilePath(teamId: string, knowledgeBaseName: string): string {
  return `env/teams/${teamId}/knowledgebases/${knowledgeBaseName}`
}

function getTeamDatabaseValuesFilePath(teamId: string, databaseName: string): string {
  return `env/teams/${teamId}/databases/${databaseName}`
}

export default class OtomiStack {
  private coreValues: Core
  editor?: string
  sessionId?: string
  isLoaded = false
  git: Git
  fileStore: FileStore

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

  async initRepo(existingStore?: FileStore): Promise<void> {
    if (existingStore) {
      this.fileStore = existingStore
      return
    }
    // Load all files into the in-memory store
    this.fileStore = await FileStore.load(this.getRepoPath())
  }

  async initGit(inflateValues = true): Promise<void> {
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
        if (await this.git.fileExists(clusterSettingsFilePath)) break
        debug(`Values are not present at ${url}:${branch}`)
      } catch (e) {
        // Remove password from error message
        const errorMessage = getSanitizedErrorMessage(e)
        debug(`Error while initializing git repository: ${errorMessage}`)
        debug(`Git repository is not ready: ${url}:${branch}`)
      }
      const timeoutMs = 10000
      debug(`Trying again in ${timeoutMs} ms`)
      await new Promise((resolve) => setTimeout(resolve, timeoutMs))
    }

    if (inflateValues) {
      await this.loadValues()
    }
    debug(`Values are loaded for ${this.editor} in ${this.sessionId}`)
  }

  async initGitWorktree(mainRepo: Git): Promise<void> {
    await this.init()
    debug(`Creating worktree for session ${this.sessionId}`)

    try {
      await mainRepo.git.revparse(`--verify refs/heads/${env.GIT_BRANCH}`)
    } catch (error) {
      const errorMessage = getSanitizedErrorMessage(error)
      throw new Error(
        `Main repository does not have branch '${env.GIT_BRANCH}'. Cannot create worktree. ${errorMessage}`,
      )
    }

    const worktreePath = this.getRepoPath()
    this.git = await getWorktreeRepo(mainRepo, worktreePath, env.GIT_BRANCH)
    this.fileStore = new FileStore()

    debug(`Worktree created for ${this.editor} in ${this.sessionId}`)
  }

  getSettingsInfo(): SettingsInfo {
    const settings = this.getSettings(['cluster', 'dns', 'otomi', 'smtp', 'ingress'])
    return {
      cluster: pick(settings.cluster, ['name', 'domainSuffix', 'apiServer', 'provider', 'linode']),
      dns: pick(settings.dns, ['zones']),
      otomi: pick(settings.otomi, ['hasExternalDNS', 'hasExternalIDP', 'isPreInstalled', 'aiEnabled']),
      smtp: pick(settings.smtp, ['smarthost']),
      ingressClassNames: map(settings.ingress?.classes, 'className') ?? [],
    } as SettingsInfo
  }

  async createObjWizard(data: ObjWizard): Promise<ObjWizard> {
    const { obj } = this.getSettings(['obj'])
    const settingsdata = { obj: { ...obj, showWizard: data.showWizard } }
    const createdBuckets = [] as Array<string>
    if (data?.apiToken && data?.regionId) {
      const { cluster } = this.getSettings(['cluster'])
      let lkeClusterId: undefined | string = defineClusterId(cluster?.name)
      if (lkeClusterId === undefined) {
        return { status: 'error', errorMessage: 'Cluster name is not found.' }
      }

      const bucketNames = {
        cnpg: `lke${lkeClusterId}-cnpg`,
        harbor: `lke${lkeClusterId}-harbor`,
        loki: `lke${lkeClusterId}-loki`,
        tempo: `lke${lkeClusterId}-tempo`,
        gitea: `lke${lkeClusterId}-gitea`,
        thanos: `lke${lkeClusterId}-thanos`,
        'kubeflow-pipelines': `lke${lkeClusterId}-kubeflow-pipelines`,
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
    const settings: Settings = {}
    const settingsFileMaps = getSettingsFileMaps(this.getRepoPath())

    // Early return: if specific keys requested, only fetch those
    if (keys && keys.length > 0) {
      keys.forEach((key) => {
        const fileMap = settingsFileMaps.get(key)
        if (!fileMap) return // Skip unknown keys

        const files = this.fileStore.getPlatformResourcesByKind(fileMap.kind)
        for (const [, content] of files) {
          settings[key] = content?.spec || content
        }
      })

      // Apply otomi nodeSelector transformation if needed
      if (keys.includes('otomi')) {
        this.transformOtomiNodeSelector(settings)
      }

      return settings
    }

    // No keys specified: fetch all settings
    for (const [name, fileMap] of settingsFileMaps.entries()) {
      const files = this.fileStore.getPlatformResourcesByKind(fileMap.kind)
      for (const [, content] of files) {
        settings[name] = content?.spec || content
      }
    }

    // Apply otomi nodeSelector transformation
    this.transformOtomiNodeSelector(settings)

    return settings
  }

  private transformOtomiNodeSelector(settings: Settings): void {
    const nodeSelector = settings.otomi?.nodeSelector
    if (!Array.isArray(nodeSelector)) {
      const nodeSelectorArray = Object.entries(nodeSelector || {}).map(([name, value]) => ({
        name,
        value,
      }))
      set(settings, 'otomi.nodeSelector', nodeSelectorArray)
    }
  }

  async loadIngressApps(id: string): Promise<void> {
    try {
      debug(`Loading ingress apps for ${id}`)
      const content = await this.git.loadConfig('env/apps/ingress-nginx.yaml', 'env/apps/secrets.ingress-nginx.yaml')
      const values = content?.apps?.['ingress-nginx'] ?? {}

      const filePath = getResourceFilePath('AplApp', id)
      const aplApp = toPlatformObject('AplApp', id, { enabled: true, rawValues: {}, ...values })
      this.fileStore.set(filePath, aplApp)

      debug(`Ingress app loaded for ${id}`)
    } catch (error) {
      debug(`Failed to load ingress apps for ${id}:`)
    }
  }

  async removeIngressApps(id: string): Promise<void> {
    try {
      debug(`Removing ingress apps for ${id}`)
      const filePath = `env/apps/${id}.yaml`
      const secretsPath = `env/apps/secrets.${id}.yaml`

      this.fileStore.delete(filePath)
      await this.git.removeFile(filePath)
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
    const settings = this.getSettings()
    await this.editIngressApps(settings, data, settingId)
    const updatedSettingsData: any = { ...data }
    // Preserve the otomi.adminPassword when editing otomi settings
    if (settingId === 'otomi') {
      updatedSettingsData.otomi = {
        ...updatedSettingsData.otomi,
        adminPassword: settings.otomi?.adminPassword,
      }
      // convert otomi.nodeSelector to object
      if (Array.isArray(updatedSettingsData.otomi.nodeSelector)) {
        const nodeSelectorArray = updatedSettingsData.otomi.nodeSelector
        const nodeSelectorObject = nodeSelectorArray.reduce((acc, { name, value }) => {
          return { ...acc, [name]: value }
        }, {})
        updatedSettingsData.otomi.nodeSelector = nodeSelectorObject
      }
    }

    settings[settingId] = removeBlankAttributes(updatedSettingsData[settingId] as Record<string, any>)

    const settingKindMap = getSettingsFileMaps(this.getRepoPath())
    const kind = settingKindMap.get(settingId)
    if (!kind) {
      throw new Error(`Unknown settingId ${settingId}`)
    }
    const filePath = getResourceFilePath(kind.kind, settingId)
    const spec = settings[settingId]
    const aplObject = toPlatformObject(kind.kind, settingId, spec)

    this.fileStore.set(filePath, aplObject)

    await this.saveSettings()
    await this.doDeployment({ filePath, content: aplObject }, true, [
      `${this.getRepoPath()}/env/settings/secrets.${settingId}.yaml`,
    ])
    return settings
  }

  filterExcludedApp(apps: App | App[]) {
    const preInstalledExcludedApps = env.PREINSTALLED_EXCLUDED_APPS.apps
    const hiddenApps = env.HIDDEN_APPS.apps
    const excludedApps = preInstalledExcludedApps.concat(hiddenApps)
    const settingsInfo = this.getSettingsInfo()
    if (!Array.isArray(apps)) {
      if (settingsInfo.otomi && settingsInfo.otomi.isPreInstalled && excludedApps.includes(apps.id)) {
        // eslint-disable-next-line no-param-reassign
        ;(apps as ExcludedApp).managed = true
        return apps as ExcludedApp
      }
    } else if (Array.isArray(apps)) {
      if (settingsInfo.otomi && settingsInfo.otomi.isPreInstalled) {
        return apps.filter((app) => !excludedApps.includes(app.id))
      } else {
        return apps
      }
    }
    return apps
  }

  getTeamApp(teamId: string, id: string): App | ExcludedApp {
    const app = this.getApp(id)
    this.filterExcludedApp(app)

    if (teamId === 'admin') return app
    return { id: app.id, enabled: app.enabled }
  }

  getApp(name: string): App {
    const filePath = getResourceFilePath('AplApp', name)
    const content = this.fileStore.get(filePath)

    if (!content) {
      throw new Error(`App ${name} not found`)
    }

    return { values: content.spec, id: content.metadata.name } as App
  }

  getApps(teamId: string): Array<App> {
    const appList = this.getAppList()

    const allApps = appList.map((id) => {
      return this.getApp(id)
    })

    const providerSpecificApps = this.filterExcludedApp(allApps) as App[]

    if (teamId === 'admin')
      return providerSpecificApps.map((app) => {
        return {
          id: app.id,
          enabled: Boolean(app.values?.enabled ?? true),
        }
      })

    const core = this.getCore()
    const teamApps = providerSpecificApps
      .map((app: App) => {
        const isShared = !!core.adminApps.find((a) => a.name === app.id)?.isShared
        const inTeamApps = !!core.teamApps.find((a) => a.name === app.id)
        if (isShared || inTeamApps) return app
      })
      .filter((app): app is App => app !== undefined)

    return teamApps.map((app) => {
      return {
        id: app.id,
        enabled: Boolean(app.values?.enabled ?? true),
      }
    })
  }

  async editApp(teamId: string, id: string, data: App): Promise<App> {
    let app: App = this.getApp(id)
    // Only merge editable data sections
    const updatedValues = {
      enabled: !!data.values?.enabled,
      values: omit(data.values, ['enabled', '_rawValues']),
      rawValues: (data.values?._rawValues as Record<string, any>) || undefined,
    }
    app = { ...app, ...updatedValues }

    const filePath = getResourceFilePath('AplApp', id)
    const aplApp = toPlatformObject('AplApp', id, { enabled: app.enabled, _rawValues: app.rawValues, ...app.values })
    this.fileStore.set(filePath, aplApp)

    await this.saveAdminApp(app)
    await this.doDeployment({ filePath, content: aplApp }, true, [`${this.getRepoPath()}/env/apps/secrets.${id}.yaml`])
    return this.getApp(id)
  }

  canToggleApp(id: string): boolean {
    const app = getAppSchema(id)
    return app.properties!.enabled !== undefined
  }

  async toggleApps(teamId: string, ids: string[], enabled: boolean): Promise<void> {
    const aplRecords = (
      await Promise.all(
        ids.map(async (id) => {
          const orig = this.getApp(id)
          if (orig && this.canToggleApp(id)) {
            const filePath = getResourceFilePath('AplApp', id)
            const aplApp = this.fileStore.get(filePath)
            if (!aplApp) {
              throw new NotExistError(`App ${id} not found`)
            }
            set(aplApp, 'spec.enabled', enabled)

            await this.saveAppToggle(aplApp)
            return { filePath, content: aplApp } as AplRecord
          }
          return undefined
        }),
      )
    ).filter((record): record is AplRecord => record !== undefined)

    if (aplRecords.length === 0) {
      throw new Error(`Failed toggling apps ${ids.toString()}`)
    }
    await this.doDeployments(
      aplRecords,
      true,
      ids.map((id) => `${this.getRepoPath()}/env/apps/secrets.${id}.yaml`),
    )
  }

  getTeams(): Array<Team> {
    const teams: Team[] = []
    const teamIds = this.fileStore.getTeamIds()

    for (const teamId of teamIds) {
      const settingsFiles = this.fileStore.getTeamResourcesByKindAndTeamId('AplTeamSettingSet', teamId)
      for (const [, content] of settingsFiles) {
        // v1 format: return spec directly
        const team = getV1ObjectFromApl(content as AplTeamSettingsResponse) as Team
        if (team) {
          team.name = team.name || teamId
          teams.push(team as Team)
        }
      }
    }

    return teams
  }

  getTeamIds(): string[] {
    return this.fileStore.getTeamIds()
  }

  getAplTeams(): AplTeamSettingsResponse[] {
    const teams: AplTeamSettingsResponse[] = []
    const teamIds = this.fileStore.getTeamIds()

    for (const teamId of teamIds) {
      if (teamId === 'admin') continue
      const settingsFiles = this.fileStore.getTeamResourcesByKindAndTeamId('AplTeamSettingSet', teamId)
      for (const [, content] of settingsFiles) {
        if (content) {
          // Return full v2 object with password removed
          const team = { ...content }
          if (team.spec) {
            team.spec = { ...team.spec, password: undefined }
          }
          teams.push(team as AplTeamSettingsResponse)
        }
      }
    }

    return teams
  }

  getTeamSelfServiceFlags(id: string): TeamSelfService {
    const data = this.getTeam(id)
    return data.selfService
  }

  getCore(): Core {
    return this.coreValues
  }

  getTeam(name: string): Team {
    const settingsResponse = this.fileStore.getTeamResource('AplTeamSettingSet', name, 'settings')
    if (!settingsResponse) {
      throw new Error(`Team ${name} not found`)
    }
    const team = getV1ObjectFromApl(settingsResponse as AplTeamSettingsResponse) as Team
    team.name = team.name || name
    unset(team, 'password') // Remove password from the response
    return team
  }

  getAplTeam(name: string): AplTeamSettingsResponse {
    const settingsResponse = this.fileStore.getTeamResource(
      'AplTeamSettingSet',
      name,
      'settings',
    ) as AplTeamSettingsResponse
    if (!settingsResponse) {
      throw new Error(`Team ${name} not found`)
    }
    unset(settingsResponse, 'spec.password') // Remove password from the response
    return settingsResponse
  }

  async createTeam(data: Team): Promise<Team> {
    const newTeam = await this.createAplTeam(getAplObjectFromV1('AplTeamSettingSet', data) as AplTeamSettingsRequest)
    return getV1ObjectFromApl(newTeam) as Team
  }

  async createAplTeam(data: AplTeamSettingsRequest): Promise<AplTeamSettingsResponse> {
    const teamName = data.metadata.name
    if (teamName.length < 3) throw new ValidationError('Team name must be at least 3 characters long')
    if (teamName.length > 9) throw new ValidationError('Team name must not exceed 9 characters')

    if (isEmpty(data.spec.password)) {
      debug(`creating password for team '${teamName}'`)
      // eslint-disable-next-line no-param-reassign
      data.spec.password = generatePassword({
        length: 16,
        numbers: true,
        symbols: false,
        lowercase: true,
        uppercase: true,
        strict: true,
      })
    }

    const teamObject = toTeamObject(teamName, data)
    const team = await this.saveTeam(teamObject)
    await this.doDeployment(team, true, [`${this.getRepoPath()}/env/teams/${teamName}/secrets.settings.yaml`])
    return team.content as AplTeamSettingsResponse
  }

  async editTeam(name: string, data: Team): Promise<Team> {
    const mergeObj = getV1MergeObject(data) as DeepPartial<AplTeamSettingsRequest>
    const mergedTeam = await this.editAplTeam(name, mergeObj)
    return getV1ObjectFromApl(mergedTeam) as Team
  }

  async editAplTeam(
    name: string,
    data: AplTeamSettingsRequest | DeepPartial<AplTeamSettingsRequest>,
    patch = false,
  ): Promise<AplTeamSettingsResponse> {
    const currentTeam = this.getAplTeam(name)

    const updatedSpec = patch ? merge(cloneDeep(currentTeam.spec), data.spec) : { ...currentTeam.spec, ...data.spec }

    const teamObject = buildTeamObject(currentTeam, updatedSpec)
    const team = await this.saveTeam(teamObject)
    await this.doDeployment(team, true, [`${this.getRepoPath()}/env/teams/${name}/secrets.settings.yaml`])
    return team.content as AplTeamSettingsResponse
  }

  async deleteTeam(id: string): Promise<void> {
    const filePaths = await this.deleteTeamObjects(id)
    await this.doDeleteDeployment(filePaths)
  }

  async saveTeamConfigItem(aplTeamObject: AplTeamObject): Promise<AplRecord> {
    debug(
      `Saving ${aplTeamObject.kind} ${aplTeamObject.metadata.name} for team ${aplTeamObject.metadata.labels['apl.io/teamId']}`,
    )

    const filePath = this.fileStore.setTeamResource(aplTeamObject)
    await this.git.writeFile(filePath, aplTeamObject)

    return { filePath, content: aplTeamObject }
  }

  async saveTeamWorkload(aplTeamObject: AplTeamObject): Promise<AplRecord> {
    const teamId = aplTeamObject.metadata.labels['apl.io/teamId']
    debug(`Saving AplTeamWorkload ${aplTeamObject.metadata.name} for team ${teamId}`)

    // Create workload object without values for file storage
    const workload = {
      ...aplTeamObject,
      spec: omit(aplTeamObject.spec, 'values'),
    } as AplTeamObject

    const filePath = this.fileStore.setTeamResource(workload)
    await this.git.writeFile(filePath, workload)

    return { filePath, content: workload }
  }

  async saveTeamWorkloadValues(
    teamId: string,
    name: string,
    values: string,
    createManagedFile = false,
  ): Promise<AplRecord> {
    debug(`Saving AplTeamWorkloadValues ${name} for team ${teamId}`)
    //AplTeamWorkloadValues does not adhere the AplObject structure so we set it as any
    const aplRecord = this.fileStore.set(getTeamWorkloadValuesFilePath(teamId, name), values as any)
    await this.git.writeTextFile(aplRecord.filePath, values)
    if (createManagedFile) {
      const filePathValuesManaged = getTeamWorkloadValuesManagedFilePath(teamId, name)
      await this.git.writeTextFile(filePathValuesManaged, '')
    }
    return aplRecord
  }

  async saveTeamSealedSecret(teamId: string, data: AplSecretRequest): Promise<AplRecord> {
    debug(`Saving sealed secrets of team: ${teamId}`)
    const { metadata } = data
    const aplObject = toTeamObject(teamId, data) as AplSecretResponse
    const sealedSecretChartValues = sealedSecretManifest(aplObject)
    const aplRecord = this.fileStore.set(
      getTeamSealedSecretsValuesFilePath(teamId, metadata.name),
      sealedSecretChartValues,
    )
    await this.git.writeFile(aplRecord.filePath, sealedSecretChartValues as any)

    return aplRecord
  }

  async deleteTeamConfigItem(kind: AplKind, teamId: string, name: string): Promise<string> {
    debug(`Removing ${kind} ${name} for team ${teamId}`)

    const filePath = this.fileStore.deleteTeamResource(kind, teamId, name)
    await this.git.removeFile(filePath)
    return filePath
  }

  async deleteTeamWorkload(kind: AplKind, teamId: string, name: string): Promise<string> {
    debug(`Removing AplWorkload ${name} for team ${teamId}`)

    // Delete workload file
    const workloadFilePath = this.fileStore.deleteTeamResource(kind, teamId, name)
    await this.git.removeFile(workloadFilePath)

    // Delete workload values file
    const valuesFilePath = getTeamWorkloadValuesFilePath(teamId, name)
    await this.git.removeFile(valuesFilePath)

    // Delete managed values file
    const managedFilePath = getTeamWorkloadValuesManagedFilePath(teamId, name)
    await this.git.removeFile(managedFilePath)
    return workloadFilePath
  }

  getTeamNetpols(teamId: string): Netpol[] {
    return this.getTeamAplNetpols(teamId).map((netpol) => getV1ObjectFromApl(netpol) as Netpol)
  }

  getTeamAplNetpols(teamId: string): AplNetpolResponse[] {
    const files = this.fileStore.getTeamResourcesByKindAndTeamId('AplTeamNetworkControl', teamId)
    return Array.from(files.values()) as AplNetpolResponse[]
  }

  getAllNetpols(): Netpol[] {
    return this.getAllAplNetpols().map((netpol) => getV1ObjectFromApl(netpol) as Netpol)
  }

  getAllAplNetpols(): AplNetpolResponse[] {
    const files = this.fileStore.getAllTeamResourcesByKind('AplTeamNetworkControl')
    return Array.from(files.values()) as AplNetpolResponse[]
  }

  async createNetpol(teamId: string, data: Netpol): Promise<Netpol> {
    const newNetpol = await this.createAplNetpol(
      teamId,
      getAplObjectFromV1('AplTeamNetworkControl', data) as AplNetpolRequest,
    )
    return getV1ObjectFromApl(newNetpol) as Netpol
  }

  async createAplNetpol(teamId: string, data: AplNetpolRequest): Promise<AplNetpolResponse> {
    if (data.metadata.name.length < 2)
      throw new ValidationError('Network policy name must be at least 2 characters long')
    if (this.fileStore.getTeamResource('AplTeamNetworkControl', teamId, data.metadata.name)) {
      throw new AlreadyExists('Network policy name already exists')
    }

    const teamObject = toTeamObject(teamId, data)
    const aplRecord = await this.saveTeamConfigItem(teamObject)
    await this.doDeployment(aplRecord, false)
    return aplRecord.content as AplNetpolResponse
  }

  getNetpol(teamId: string, name: string): Netpol {
    const netpol = this.getAplNetpol(teamId, name)
    return getV1ObjectFromApl(netpol) as Netpol
  }

  getAplNetpol(teamId: string, name: string): AplNetpolResponse {
    const netpol = this.fileStore.getTeamResource('AplTeamNetworkControl', teamId, name)
    if (!netpol) {
      throw new NotExistError(`Network policy ${name} not found in team ${teamId}`)
    }
    return netpol as AplNetpolResponse
  }

  async editNetpol(teamId: string, name: string, data: Netpol): Promise<Netpol> {
    const mergeObj = getV1MergeObject(data) as DeepPartial<AplNetpolRequest>
    const mergedNetpol = await this.editAplNetpol(teamId, name, mergeObj)
    return getV1ObjectFromApl(mergedNetpol) as Netpol
  }

  async editAplNetpol(
    teamId: string,
    name: string,
    data: AplNetpolRequest | DeepPartial<AplNetpolRequest>,
    patch = false,
  ): Promise<AplNetpolResponse> {
    const existing = this.getAplNetpol(teamId, name)
    const updatedSpec = patch
      ? merge(cloneDeep(existing.spec), data.spec)
      : ({ ...existing.spec, ...data.spec } as Netpol)

    const teamObject = buildTeamObject(existing, updatedSpec)

    const aplRecord = await this.saveTeamConfigItem(teamObject)
    await this.doDeployment(aplRecord, false)
    return aplRecord.content as AplNetpolResponse
  }

  async deleteNetpol(teamId: string, name: string): Promise<void> {
    const filePath = await this.deleteTeamConfigItem('AplTeamNetworkControl', teamId, name)
    await this.doDeleteDeployment([filePath])
  }

  getAllUsers(sessionUser: SessionUser): Array<User> {
    const files = this.fileStore.getPlatformResourcesByKind('AplUser')
    const aplObjects = Array.from(files.values()) as AplObject[]
    const users = aplObjects.map((aplObject) => {
      return { ...aplObject.spec, id: aplObject.metadata.name } as User
    })
    if (sessionUser.isPlatformAdmin) {
      return users
    } else if (sessionUser.isTeamAdmin) {
      const usersWithBasicInfo = users.map((user) => {
        const { id, email, isPlatformAdmin, isTeamAdmin, teams } = user
        return { id, email, isPlatformAdmin, isTeamAdmin, teams }
      })
      return usersWithBasicInfo as Array<User>
    }
    throw new ForbiddenError()
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
    const userId = uuidv4()
    const user: User = { ...data, id: userId, initialPassword }

    // Get existing users' emails
    const files = this.fileStore.getPlatformResourcesByKind('AplUser')
    let existingUsersEmail = Array.from(files.values()).map((aplObject: AplObject) => aplObject.spec.email)

    if (!env.isDev) {
      const { otomi, cluster } = this.getSettings(['otomi', 'cluster'])
      const keycloak = this.getApp('keycloak')
      const keycloakBaseUrl = `https://keycloak.${cluster?.domainSuffix}`
      const realm = 'otomi'
      const username = keycloak?.values?.adminUsername as string
      const password = otomi?.adminPassword as string
      existingUsersEmail = await getKeycloakUsers(keycloakBaseUrl, realm, username, password)
    }
    if (existingUsersEmail.some((existingUser) => existingUser === user.email)) {
      throw new AlreadyExists('User email already exists')
    }

    const aplRecord = await this.saveUser(user)
    await this.doDeployment(aplRecord, true, [`${this.getRepoPath()}/env/users/secrets.${userId}.yaml`])
    return user
  }

  getUser(id: string, sessionUser: SessionUser): User {
    const filePath = getResourceFilePath('AplUser', id)
    const user = this.fileStore.get(filePath)
    if (!user) {
      throw new NotExistError(`User ${id} not found`)
    }

    if (sessionUser.isPlatformAdmin) {
      return { ...user.spec, id } as User
    }
    if (sessionUser.isTeamAdmin) {
      const { email, isPlatformAdmin, isTeamAdmin, teams } = user.spec
      return { id, email, isPlatformAdmin, isTeamAdmin, teams } as User
    }
    throw new ForbiddenError()
  }

  async editUser(id: string, data: User, sessionUser: SessionUser): Promise<User> {
    if (!sessionUser.isPlatformAdmin) {
      throw new ForbiddenError('Only platform admins can modify user details.')
    }

    const filePath = getResourceFilePath('AplUser', id)
    const existing = this.fileStore.get(filePath)
    if (!existing) {
      throw new NotExistError(`User ${id} not found`)
    }

    const user: User = { ...existing, ...data, id }

    const aplRecord = await this.saveUser(user)
    await this.doDeployment(aplRecord, true, [`${this.getRepoPath()}/env/users/secrets.${id}.yaml`])
    return user
  }

  async deleteUser(id: string): Promise<void> {
    const filePath = getResourceFilePath('AplUser', id)
    const aplObject = this.fileStore.get(filePath)
    if (!aplObject) {
      throw new NotExistError(`User ${id} not found`)
    }
    const user = aplObject.spec as User
    if (user.email === env.DEFAULT_PLATFORM_ADMIN_EMAIL) {
      throw new ForbiddenError('Cannot delete the default platform admin user')
    }

    await this.deleteUserFile(id)
    await this.doDeleteDeployment([filePath])
  }

  private canTeamAdminUpdateUserTeams(sessionUser: SessionUser, existingUser: User, updatedUserTeams: string[]) {
    if (!sessionUser.isTeamAdmin) return false

    const sessionUserTeams = new Set(sessionUser.teams)
    const oldTeams = new Set(existingUser.teams)
    const newTeams = new Set(updatedUserTeams)

    const addedTeams = [...newTeams].filter((team) => !oldTeams.has(team))
    const removedTeams = [...oldTeams].filter((team) => !newTeams.has(team))

    // Team admin can only add or remove users from their own teams
    const allChangedTeams = [...addedTeams, ...removedTeams]
    let isValid = allChangedTeams.every((team) => sessionUserTeams.has(team))

    // Prevent team admin from removing themselves or other team admins from teams they manage
    if (isValid && removedTeams.length > 0) {
      // If the user being updated is themselves or another team admin
      if (existingUser.email === sessionUser.email || existingUser.isTeamAdmin) {
        // Check if any of the removed teams are managed by the session user
        if (removedTeams.some((team) => sessionUserTeams.has(team))) {
          isValid = false
        }
      }
    }

    return isValid
  }

  async editTeamUsers(
    data: Pick<User, 'id' | 'teams'>[],
    sessionUser: SessionUser,
  ): Promise<Pick<User, 'id' | 'teams'>[]> {
    if (!sessionUser.isPlatformAdmin && !sessionUser.isTeamAdmin) {
      throw new ForbiddenError("Only platform admins or team admins can modify a user's team memberships.")
    }

    const secretFiles: string[] = []
    const aplRecords: AplRecord[] = []

    for (const userData of data) {
      if (!userData.id) {
        throw new NotExistError(`User ${userData.id} not found`)
      }
      const filePath = getResourceFilePath('AplUser', userData.id)
      const aplObject = this.fileStore.get(filePath)
      if (!aplObject) {
        throw new NotExistError(`User ${userData.id} not found`)
      }
      const existingUser = aplObject.spec as User

      if (
        !sessionUser.isPlatformAdmin &&
        !this.canTeamAdminUpdateUserTeams(sessionUser, existingUser, userData.teams as string[])
      ) {
        throw new ForbiddenError(
          'Team admins are permitted to add or remove users only within the teams they manage. However, they cannot remove themselves or other team admins from those teams.',
        )
      }

      const updatedUser: User = { ...existingUser, teams: userData.teams }
      const aplRecord = await this.saveUser(updatedUser)
      secretFiles.push(`${this.getRepoPath()}/env/users/secrets.${userData.id}.yaml`)
      aplRecords.push(aplRecord)
    }

    await this.doDeployments(aplRecords, true, secretFiles)

    const users = aplRecords.map((aplRecord: AplRecord) => ({
      id: aplRecord.content.spec.id,
      teams: aplRecord.content.spec.teams || [],
    }))
    return users
  }

  getTeamCodeRepos(teamId: string): CodeRepo[] {
    return this.getTeamAplCodeRepos(teamId).map((codeRepo) => getV1ObjectFromApl(codeRepo) as CodeRepo)
  }

  getTeamAplCodeRepos(teamId: string): AplCodeRepoResponse[] {
    const files = this.fileStore.getTeamResourcesByKindAndTeamId('AplTeamCodeRepo', teamId)
    return Array.from(files.values()) as AplCodeRepoResponse[]
  }

  getAllCodeRepos(): CodeRepo[] {
    return this.getAllAplCodeRepos().map((codeRepo) => getV1ObjectFromApl(codeRepo) as CodeRepo)
  }

  getAllAplCodeRepos(): AplCodeRepoResponse[] {
    const files = this.fileStore.getAllTeamResourcesByKind('AplTeamCodeRepo')
    return Array.from(files.values()) as AplCodeRepoResponse[]
  }

  async createCodeRepo(teamId: string, data: CodeRepo): Promise<CodeRepo> {
    const newCodeRepo = await this.createAplCodeRepo(
      teamId,
      getAplObjectFromV1('AplTeamCodeRepo', data) as AplCodeRepoRequest,
    )
    return getV1ObjectFromApl(newCodeRepo) as CodeRepo
  }

  async createAplCodeRepo(teamId: string, data: AplCodeRepoRequest): Promise<AplCodeRepoResponse> {
    // Check if URL already exists
    const existingRepos = this.getTeamAplCodeRepos(teamId)
    const allRepoUrls = existingRepos.map((repo) => repo.spec.repositoryUrl) || []
    if (allRepoUrls.includes(data.spec.repositoryUrl)) throw new AlreadyExists('Code repository URL already exists')
    const allNames = existingRepos.map((repo) => repo.metadata.name) || []
    if (allNames.includes(data.metadata.name)) throw new AlreadyExists('Code repo name already exists')
    if (!data.spec.private) unset(data.spec, 'secret')
    if (data.spec.gitService === 'gitea') unset(data.spec, 'private')

    const teamObject = toTeamObject(teamId, data)
    const aplRecord = await this.saveTeamConfigItem(teamObject)
    await this.doDeployment(aplRecord, false)
    return aplRecord.content as AplCodeRepoResponse
  }

  getCodeRepo(teamId: string, name: string): CodeRepo {
    return getV1ObjectFromApl(this.getAplCodeRepo(teamId, name)) as CodeRepo
  }

  getAplCodeRepo(teamId: string, name: string): AplCodeRepoResponse {
    const codeRepo = this.fileStore.getTeamResource('AplTeamCodeRepo', teamId, name)
    if (!codeRepo) {
      throw new NotExistError(`Code repo ${name} not found in team ${teamId}`)
    }
    return codeRepo as AplCodeRepoResponse
  }

  async editCodeRepo(teamId: string, name: string, data: CodeRepo): Promise<CodeRepo> {
    const mergeObj = getV1MergeObject(data) as DeepPartial<AplCodeRepoRequest>
    const mergedCodeRepo = await this.editAplCodeRepo(teamId, name, mergeObj)
    return getV1ObjectFromApl(mergedCodeRepo) as CodeRepo
  }

  async editAplCodeRepo(
    teamId: string,
    name: string,
    data: DeepPartial<AplCodeRepoRequest>,
    patch = false,
  ): Promise<AplCodeRepoResponse> {
    if (!data.spec?.private) unset(data.spec, 'secret')
    if (data.spec?.gitService === 'gitea') unset(data.spec, 'private')

    const existing = this.getAplCodeRepo(teamId, name)
    const updatedSpec = patch ? merge(cloneDeep(existing.spec), data.spec) : { ...existing.spec, ...data.spec }

    const teamObject = buildTeamObject(existing, updatedSpec)

    const aplRecord = await this.saveTeamConfigItem(teamObject)
    await this.doDeployment(aplRecord, false)
    return aplRecord.content as AplCodeRepoResponse
  }

  async deleteCodeRepo(teamId: string, name: string): Promise<void> {
    const filePath = await this.deleteTeamConfigItem('AplTeamCodeRepo', teamId, name)
    await this.doDeleteDeployment([filePath])
  }

  async getRepoBranches(codeRepoName: string, teamId: string): Promise<string[]> {
    if (!codeRepoName) return ['HEAD']
    const coderepo = this.getCodeRepo(teamId, codeRepoName)
    const { repositoryUrl, secret: secretName } = coderepo
    const { cluster } = this.getSettings(['cluster'])
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

      const repoUrl = isInteralGiteaURL(repositoryUrl, cluster?.domainSuffix)
        ? repositoryUrl
        : normalizeRepoUrl(repositoryUrl, isPrivate, isSSH)

      if (!repoUrl) return ['HEAD']

      if (isPrivate) return await getPrivateRepoBranches(repoUrl, sshPrivateKey, username, accessToken)

      return await getPublicRepoBranches(repoUrl)
    } catch (error) {
      const errorMessage = error.response?.data?.message || error?.message || 'Failed to get repo branches'
      debug('Error getting branches:', errorMessage)
      return []
    }
  }

  async getTestRepoConnect(url: string, teamId: string, secretName: string): Promise<TestRepoConnect> {
    try {
      let sshPrivateKey = '',
        username = '',
        accessToken = ''

      const isPrivate = !!secretName

      if (isPrivate) {
        const secret = await getSecretValues(secretName, `team-${teamId}`)
        sshPrivateKey = secret?.['ssh-privatekey'] || ''
        username = secret?.username || ''
        accessToken = secret?.password || ''
      }

      const isSSH = !!sshPrivateKey
      const repoUrl = normalizeRepoUrl(url, isPrivate, isSSH)

      if (!repoUrl) return { status: 'failed' }

      if (isPrivate) {
        return (await testPrivateRepoConnect(repoUrl, sshPrivateKey, username, accessToken)) as TestRepoConnect
      }

      return (await testPublicRepoConnect(repoUrl)) as TestRepoConnect
    } catch (error) {
      return { status: 'failed' }
    }
  }

  async getInternalRepoUrls(teamId: string): Promise<string[]> {
    if (env.isDev || !teamId || teamId === 'admin') return []
    const { cluster, otomi } = this.getSettings(['cluster', 'otomi'])
    const gitea = this.getApp('gitea')
    const username = (gitea?.values?.adminUsername ?? '') as string
    const password = (gitea?.values?.adminPassword ?? otomi?.adminPassword ?? '') as string
    const orgName = `team-${teamId}`
    const domainSuffix = cluster?.domainSuffix
    const internalRepoUrls = (await getGiteaRepoUrls(username, password, orgName, domainSuffix)) || []
    return internalRepoUrls
  }

  getDashboard(teamId: string): Array<any> {
    const codeRepos = teamId ? this.getTeamAplCodeRepos(teamId) : this.getAllCodeRepos()
    const builds = teamId ? this.getTeamAplBuilds(teamId) : this.getAllBuilds()
    const workloads = teamId ? this.getTeamAplWorkloads(teamId) : this.getAllWorkloads()
    const services = teamId ? this.getTeamAplServices(teamId) : this.getAllServices()
    const secrets = teamId ? this.getAplSealedSecrets(teamId) : this.getAllAplSealedSecrets()
    const netpols = teamId ? this.getTeamAplNetpols(teamId) : this.getAllNetpols()

    return [
      { name: 'code-repositories', count: codeRepos?.length },
      { name: 'container-images', count: builds?.length },
      { name: 'workloads', count: workloads?.length },
      { name: 'services', count: services?.length },
      { name: 'secrets', count: secrets?.length },
      { name: 'network-policies', count: netpols?.length },
    ]
  }

  getTeamBuilds(teamId: string): Build[] {
    return this.getTeamAplBuilds(teamId).map((build) => getV1ObjectFromApl(build) as Build)
  }

  getTeamAplBuilds(teamId: string): AplBuildResponse[] {
    const files = this.fileStore.getTeamResourcesByKindAndTeamId('AplTeamBuild', teamId)
    return Array.from(files.values()) as AplBuildResponse[]
  }

  getAllBuilds(): Build[] {
    return this.getAllAplBuilds().map((build) => getV1ObjectFromApl(build) as Build)
  }

  getAllAplBuilds(): AplBuildResponse[] {
    const files = this.fileStore.getAllTeamResourcesByKind('AplTeamBuild')
    return Array.from(files.values()) as AplBuildResponse[]
  }

  async createBuild(teamId: string, data: Build): Promise<Build> {
    const newBuild = await this.createAplBuild(teamId, getAplObjectFromV1('AplTeamBuild', data) as AplBuildRequest)
    return getV1ObjectFromApl(newBuild) as Build
  }

  async createAplBuild(teamId: string, data: AplBuildRequest): Promise<AplBuildResponse> {
    const buildName = `${data?.spec?.imageName}-${data?.spec?.tag}`
    if (data.spec.secretName && data.spec.secretName.length < 2)
      throw new ValidationError('Secret name must be at least 2 characters long')
    if (buildName.length > 128) {
      throw new HttpError(
        400,
        'Invalid container image name, the combined image name and tag must not exceed 128 characters.',
      )
    }
    if (this.fileStore.getTeamResource('AplTeamBuild', teamId, data.metadata.name)) {
      throw new AlreadyExists('Container image name already exists')
    }

    const teamObject = toTeamObject(teamId, data)
    const aplRecord = await this.saveTeamConfigItem(teamObject)
    await this.doDeployment(aplRecord, false)
    return aplRecord.content as AplBuildResponse
  }

  getBuild(teamId: string, name: string): Build {
    return getV1ObjectFromApl(this.getAplBuild(teamId, name)) as Build
  }

  getAplBuild(teamId: string, name: string): AplBuildResponse {
    const build = this.fileStore.getTeamResource('AplTeamBuild', teamId, name)
    if (!build) {
      throw new NotExistError(`Build ${name} not found in team ${teamId}`)
    }
    return build as AplBuildResponse
  }

  async editBuild(teamId: string, name: string, data: Build): Promise<Build> {
    const mergeObj = getV1MergeObject(data) as DeepPartial<AplBuildRequest>
    const mergedBuild = await this.editAplBuild(teamId, name, mergeObj)
    return getV1ObjectFromApl(mergedBuild) as Build
  }

  async editAplBuild(
    teamId: string,
    name: string,
    data: AplBuildRequest | DeepPartial<AplBuildRequest>,
    patch = false,
  ): Promise<AplBuildResponse> {
    const existing = this.getAplBuild(teamId, name)

    const updatedSpec = patch
      ? merge(cloneDeep(existing.spec), data.spec)
      : ({ ...existing.spec, ...data.spec } as Build)

    const teamObject = buildTeamObject(existing, updatedSpec)

    const aplRecord = await this.saveTeamConfigItem(teamObject)
    await this.doDeployment(aplRecord, false)
    return aplRecord.content as AplBuildResponse
  }

  async deleteBuild(teamId: string, name: string): Promise<void> {
    const filePath = await this.deleteTeamConfigItem('AplTeamBuild', teamId, name)
    await this.doDeleteDeployment([filePath])
  }

  getTeamPolicies(teamId: string): Policies {
    const policies = {}
    this.getTeamAplPolicies(teamId).forEach((policy) => {
      policies[policy.metadata.name] = policy.spec
    })
    return policies
  }

  getTeamAplPolicies(teamId: string): AplPolicyResponse[] {
    const files = this.fileStore.getTeamResourcesByKindAndTeamId('AplTeamPolicy', teamId)
    return Array.from(files.values()) as AplPolicyResponse[]
  }

  getAllPolicies(): Record<string, Policies> {
    const teamPolicies: Record<string, Policies> = {}
    const teamIds = this.fileStore.getTeamIds()
    teamIds.forEach((teamId) => {
      teamPolicies[teamId] = this.getTeamPolicies(teamId)
    })
    return teamPolicies
  }

  getAllAplPolicies(): AplPolicyResponse[] {
    const files = this.fileStore.getAllTeamResourcesByKind('AplTeamPolicy')
    return Array.from(files.values()) as AplPolicyResponse[]
  }

  getPolicy(teamId: string, id: string): Policy {
    return this.getAplPolicy(teamId, id).spec
  }

  getAplPolicy(teamId: string, id: string): AplPolicyResponse {
    const policy = this.fileStore.getTeamResource('AplTeamPolicy', teamId, id)
    if (!policy) {
      throw new NotExistError(`Policy ${id} not found in team ${teamId}`)
    }
    return policy as AplPolicyResponse
  }

  async editPolicy(teamId: string, policyId: string, data: Policy): Promise<Policy> {
    const mergeObj = {
      metadata: { name: policyId },
      spec: data,
    } as DeepPartial<AplPolicyRequest>
    const mergedPolicy = await this.editAplPolicy(teamId, policyId, mergeObj)
    return mergedPolicy.spec
  }

  async editAplPolicy(
    teamId: string,
    policyId: string,
    data: AplPolicyRequest | DeepPartial<AplPolicyRequest>,
    patch = false,
  ): Promise<AplPolicyResponse> {
    const existing = this.getAplPolicy(teamId, policyId)
    const updatedSpec = patch
      ? merge(cloneDeep(existing.spec), data.spec)
      : ({ ...existing.spec, ...data.spec } as Policy)

    const teamObject = buildTeamObject(existing, updatedSpec)

    const aplRecord = await this.saveTeamConfigItem(teamObject)
    await this.doDeployment(aplRecord, false)
    return aplRecord.content as AplPolicyResponse
  }

  async getK8sVersion(): Promise<string> {
    return (await getKubernetesVersion()) as string
  }

  async connectCloudtty(teamId: string, sessionUser: SessionUser): Promise<Cloudtty> {
    if (!sessionUser.sub) {
      debug('No user sub found, cannot connect to shell.')
      throw new OtomiError(500, 'No user sub found, cannot connect to shell.')
    }
    const userTeams = sessionUser.teams.map((teamName) => `team-${teamName}`)
    const variables = {
      FQDN: '',
      SUB: sessionUser.sub,
    }
    try {
      const { cluster } = this.getSettings(['cluster'])
      variables.FQDN = cluster?.domainSuffix || ''
    } catch (error) {
      debug('Error getting cluster settings for cloudtty:', error.message)
    }
    if (!variables.FQDN) {
      debug('No cluster domain suffix found, cannot connect to shell.')
      throw new OtomiError(500, 'No cluster domain suffix found, cannot connect to shell.')
    }

    // if cloudtty shell does not exists then check if the pod is running and return it
    if (await checkPodExists('team-admin', `tty-${sessionUser.sub}`)) {
      return { iFrameUrl: `https://tty.${variables.FQDN}/${sessionUser.sub}` }
    }

    if (await pathExists('/tmp/ttyd.yaml')) await unlink('/tmp/ttyd.yaml')

    //if user is admin then read the manifests from ./dist/src/ttyManifests/adminTtyManifests
    const files = sessionUser.isPlatformAdmin
      ? await readdir('./dist/src/ttyManifests/adminTtyManifests', 'utf-8')
      : await readdir('./dist/src/ttyManifests', 'utf-8')
    const filteredFiles = files.filter((file) => file.startsWith('tty'))
    const variableKeys = Object.keys(variables)

    const podContentAddTargetTeam = (fileContent) => {
      const regex = new RegExp(`\\$TARGET_TEAM`, 'g')
      return fileContent.replace(regex, teamId)
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
        let fileContent = sessionUser.isPlatformAdmin
          ? await readFile(`./dist/src/ttyManifests/adminTtyManifests/${file}`, 'utf-8')
          : await readFile(`./dist/src/ttyManifests/${file}`, 'utf-8')
        variableKeys.forEach((key) => {
          const regex = new RegExp(`\\$${key}`, 'g')
          fileContent = fileContent.replace(regex, variables[key] as string)
        })
        if (file === 'tty_02_Pod.yaml') fileContent = podContentAddTargetTeam(fileContent)
        if (!sessionUser.isPlatformAdmin && file === 'tty_03_Rolebinding.yaml') {
          fileContent = rolebindingContentsForUsers(fileContent)
        }
        return fileContent
      }),
    )
    await writeFile('/tmp/ttyd.yaml', fileContents, 'utf-8')
    await apply('/tmp/ttyd.yaml')
    await watchPodUntilRunning('team-admin', `tty-${sessionUser.sub}`)

    // check the pod every 30 minutes and terminate it after 2 hours of inactivity
    const ISACTIVE_INTERVAL = 30 * 60 * 1000
    const TERMINATE_TIMEOUT = 2 * 60 * 60 * 1000
    const intervalId = setInterval(() => {
      getCloudttyActiveTime('team-admin', `tty-${sessionUser.sub}`).then((activeTime: number) => {
        if (activeTime > TERMINATE_TIMEOUT) {
          this.deleteCloudtty(sessionUser)
          clearInterval(intervalId)
          debug(`Cloudtty terminated after ${TERMINATE_TIMEOUT / (60 * 60 * 1000)} hours of inactivity`)
        }
      })
    }, ISACTIVE_INTERVAL)

    return { iFrameUrl: `https://tty.${variables.FQDN}/${sessionUser.sub}` }
  }

  async deleteCloudtty(sessionUser: SessionUser): Promise<void> {
    const { sub, isPlatformAdmin, teams } = sessionUser as { sub: string; isPlatformAdmin: boolean; teams: string[] }
    const userTeams = teams.map((teamName) => `team-${teamName}`)
    try {
      if (await checkPodExists('team-admin', `tty-${sessionUser.sub}`)) {
        await k8sdelete({ sub, isPlatformAdmin, userTeams })
      }
    } catch (error) {
      debug('Failed to delete cloudtty')
    }
  }

  async getWorkloadCatalog(data: {
    url?: string
    teamId: string
  }): Promise<{ url: string; helmCharts: any; catalog: any }> {
    const { url: clientUrl, teamId } = data
    const uuid = uuidv4()
    const helmChartsDir = `/tmp/otomi/charts/${uuid}`

    const url = clientUrl || env?.HELM_CHART_CATALOG

    if (!url) throw new OtomiError(400, 'Helm chart catalog URL is not set')

    const { cluster } = this.getSettings(['cluster'])
    try {
      const { helmCharts, catalog } = await fetchWorkloadCatalog(url, helmChartsDir, teamId, cluster?.domainSuffix)
      return { url, helmCharts, catalog }
    } catch (error) {
      debug('Error fetching workload catalog')
      throw new OtomiError(404, 'No helm chart catalog found!')
    } finally {
      if (existsSync(helmChartsDir)) rmSync(helmChartsDir, { recursive: true, force: true })
    }
  }

  async getHelmChartContent(url: string): Promise<any> {
    return await fetchChartYaml(url)
  }

  async createWorkloadCatalog(body: NewHelmChartValues): Promise<boolean> {
    const { gitRepositoryUrl, chartTargetDirName, chartIcon, allowTeams } = body

    const uuid = uuidv4()
    const localHelmChartsDir = `/tmp/otomi/charts/${uuid}`
    const helmChartCatalogUrl = env.HELM_CHART_CATALOG
    const { user, email } = this.git
    const { cluster } = this.getSettings(['cluster'])

    try {
      await sparseCloneChart(
        gitRepositoryUrl,
        localHelmChartsDir,
        helmChartCatalogUrl,
        user,
        email,
        chartTargetDirName,
        chartIcon,
        allowTeams,
        cluster?.domainSuffix,
      )
      return true
    } catch (error) {
      debug('Error adding new Helm chart to catalog')
      return false
    } finally {
      // Clean up: if the temporary directory exists, remove it.
      if (existsSync(localHelmChartsDir)) rmSync(localHelmChartsDir, { recursive: true, force: true })
    }
  }

  getTeamWorkloads(teamId: string): Workload[] {
    return this.getTeamAplWorkloads(teamId).map(
      (workload) => omit(getV1ObjectFromApl(workload), ['values']) as Workload,
    )
  }

  getTeamAplWorkloads(teamId: string): AplWorkloadResponse[] {
    const files = this.fileStore.getTeamResourcesByKindAndTeamId('AplTeamWorkload', teamId)
    return Array.from(files.values()) as AplWorkloadResponse[]
  }

  getAllWorkloads(): Workload[] {
    return this.getAllAplWorkloads().map((workload) => omit(getV1ObjectFromApl(workload), ['values']) as Workload)
  }

  getAllWorkloadNames(): WorkloadName[] {
    const workloads = this.getAllAplWorkloads().map((workload) => {
      const teamId = workload.metadata.labels['apl.io/teamId']
      return {
        metadata: {
          name: workload.metadata.name,
          namespace: teamId ? `team-${teamId}` : undefined,
        },
      }
    })
    return workloads
  }

  getAllAplWorkloads(): AplWorkloadResponse[] {
    const files = this.fileStore.getAllTeamResourcesByKind('AplTeamWorkload')
    return Array.from(files.values()) as AplWorkloadResponse[]
  }

  async createWorkload(teamId: string, data: Workload): Promise<Workload> {
    const newWorkload = await this.createAplWorkload(
      teamId,
      getAplObjectFromV1('AplTeamWorkload', data) as AplWorkloadRequest,
    )
    return omit(getV1ObjectFromApl(newWorkload), ['values']) as Workload
  }

  async createAplWorkload(teamId: string, data: AplWorkloadRequest): Promise<AplWorkloadResponse> {
    if (this.fileStore.getTeamResource('AplTeamWorkload', teamId, data.metadata.name)) {
      throw new AlreadyExists('Workload name already exists')
    }

    const teamObject = toTeamObject(teamId, data)
    const aplRecord = await this.saveTeamWorkload(teamObject)

    const valuesAplRecord = await this.saveTeamWorkloadValues(
      teamId,
      data.metadata.name,
      data.spec.values || '{}',
      true,
    )
    await this.doDeployments([aplRecord, valuesAplRecord], false)
    return aplRecord.content as AplWorkloadResponse
  }

  getWorkload(teamId: string, name: string): Workload {
    const workload = this.getAplWorkload(teamId, name)
    return omit(getV1ObjectFromApl(workload), ['values']) as Workload
  }

  getAplWorkload(teamId: string, name: string): AplWorkloadResponse {
    const workload = this.fileStore.getTeamResource('AplTeamWorkload', teamId, name)
    const workloadValues = this.fileStore.getTeamResource('AplTeamWorkloadValues', teamId, name)
    if (!workload) {
      throw new NotExistError(`Workload ${name} not found in team ${teamId}`)
    }
    set(workload, 'spec.values', workloadValues || '')
    return workload as AplWorkloadResponse
  }

  async editWorkload(teamId: string, name: string, data: Workload): Promise<Workload> {
    const mergeObj = getV1MergeObject(data) as DeepPartial<AplWorkloadRequest>
    const mergedWorkload = await this.editAplWorkload(teamId, name, mergeObj)
    return omit(getV1ObjectFromApl(mergedWorkload), ['values']) as Workload
  }

  async editAplWorkload(
    teamId: string,
    name: string,
    data: AplWorkloadRequest | DeepPartial<AplWorkloadRequest>,
    patch = false,
  ): Promise<AplWorkloadResponse> {
    const existing = this.getAplWorkload(teamId, name)
    const updatedSpec = patch
      ? merge(cloneDeep(existing.spec), data.spec)
      : ({ ...existing.spec, ...data.spec } as Workload)

    const teamObject = buildTeamObject(existing, updatedSpec)

    const aplRecord = await this.saveTeamWorkload(teamObject)
    const workloadResponse = aplRecord.content as AplWorkloadResponse
    if (data.spec && 'values' in data.spec) {
      const valuesAplRecord = await this.saveTeamWorkloadValues(teamId, name, data.spec.values!)
      await this.doDeployments([aplRecord, valuesAplRecord], false)
    } else {
      await this.doDeployment(aplRecord, false)
    }
    return workloadResponse
  }

  async deleteWorkload(teamId: string, name: string): Promise<void> {
    const filePath = await this.deleteTeamWorkload('AplTeamWorkload', teamId, name)
    await this.doDeleteDeployment([filePath])
  }

  async editWorkloadValues(teamId: string, name: string, data: WorkloadValues): Promise<WorkloadValues> {
    const existing = this.getAplWorkload(teamId, name)
    const updatedSpec = {
      ...existing.spec,
      values: stringifyYaml(deepQuote(data.values)),
    }

    const workload: AplWorkloadResponse = {
      ...existing,
      spec: updatedSpec as AplWorkloadResponse['spec'],
    }
    const aplRecord = await this.saveTeamWorkloadValues(teamId, name, updatedSpec.values)
    await this.doDeployment(aplRecord, false)
    return merge(pick(getV1ObjectFromApl(workload), ['id', 'teamId', 'name']), {
      values: data.values || undefined,
    }) as WorkloadValues
  }

  getWorkloadValues(teamId: string, name: string): WorkloadValues {
    const workload = this.fileStore.getTeamResource('AplTeamWorkloadValues', teamId, name)
    return { teamId, name, values: workload as any }
  }

  getAllServices(): Service[] {
    return this.getAllAplServices().map((service) => this.transformService(service) as Service)
  }

  getAllAplServices(): AplServiceResponse[] {
    const files = this.fileStore.getAllTeamResourcesByKind('AplTeamService')
    return Array.from(files.values()) as AplServiceResponse[]
  }

  getTeamServices(teamId: string): Service[] {
    return this.getTeamAplServices(teamId).map((service) => this.transformService(service) as Service)
  }

  getTeamAplServices(teamId: string): AplServiceResponse[] {
    const files = this.fileStore.getTeamResourcesByKindAndTeamId('AplTeamService', teamId)
    return Array.from(files.values()) as AplServiceResponse[]
  }

  async createService(teamId: string, data: Service): Promise<Service> {
    const newService = await this.createAplService(
      teamId,
      getAplObjectFromV1('AplTeamService', this.convertDbServiceToValues(data)) as AplServiceRequest,
    )
    return this.transformService(newService) as Service
  }

  async createAplService(teamId: string, data: AplServiceRequest): Promise<AplServiceResponse> {
    if (data.metadata.name.length < 2) throw new ValidationError('Service name must be at least 2 characters long')
    if (data.spec.cname?.tlsSecretName && data.spec.cname?.tlsSecretName.length < 2)
      throw new ValidationError('Secret name must be at least 2 characters long')
    if (this.fileStore.getTeamResource('AplTeamService', teamId, data.metadata.name)) {
      throw new AlreadyExists('Service name already exists')
    }
    const teamObject = toTeamObject(teamId, data)
    const aplRecord = await this.saveTeamConfigItem(teamObject)
    await this.doDeployment(aplRecord, false)
    return aplRecord.content as AplServiceResponse
  }

  getService(teamId: string, name: string): Service {
    const service = this.getAplService(teamId, name)
    return this.transformService(service) as Service
  }

  getAplService(teamId: string, name: string): AplServiceResponse {
    const service = this.fileStore.getTeamResource('AplTeamService', teamId, name)
    if (!service) {
      throw new NotExistError(`Service ${name} not found in team ${teamId}`)
    }
    return service as AplServiceResponse
  }

  async editService(teamId: string, name: string, data: Service): Promise<Service> {
    const mergeObj = getV1MergeObject(this.convertDbServiceToValues(data)) as DeepPartial<AplServiceRequest>
    const mergedService = await this.editAplService(teamId, name, mergeObj)
    return getV1ObjectFromApl(mergedService) as Service
  }

  async editAplService(
    teamId: string,
    name: string,
    data: DeepPartial<AplServiceRequest>,
    patch = false,
  ): Promise<AplServiceResponse> {
    const existing = this.getAplService(teamId, name)
    const updatedSpec = patch ? merge(cloneDeep(existing.spec), data.spec) : { ...existing.spec, ...data.spec }

    const teamObject = buildTeamObject(existing, updatedSpec)

    const aplRecord = await this.saveTeamConfigItem(teamObject)
    await this.doDeployment(aplRecord, false)
    return aplRecord.content as AplServiceResponse
  }

  async deleteService(teamId: string, name: string): Promise<void> {
    const filePath = await this.deleteTeamConfigItem('AplTeamService', teamId, name)
    await this.doDeleteDeployment([filePath])
  }

  checkPublicUrlInUse(teamId: string, service: AplServiceRequest): void {
    // skip when editing or when svc is of type "cluster" as it has no url
    const newSvc = service.spec
    const services = this.getTeamAplServices(teamId)

    const servicesFiltered = filter(services, (svc) => {
      const { domain, paths } = svc.spec

      // no paths for existing or new service? then just check base url
      if (!newSvc.paths?.length && !paths?.length) return domain === newSvc.domain
      // one has paths but other doesn't? no problem
      if ((newSvc.paths?.length && !paths?.length) || (!newSvc.paths?.length && paths?.length)) return false
      // both have paths, so check full
      return paths?.some((p) => {
        const existingUrl = `${domain}${p}`
        const newUrls: string[] = newSvc.paths?.map((_p: string) => `${domain}${_p}`) || []
        return newUrls.includes(existingUrl)
      })
    })
    if (servicesFiltered.length > 0) throw new PublicUrlExists()
  }
  async doDeployments(aplRecords: AplRecord[], encryptSecrets = true, files?: string[]): Promise<void> {
    const rootStack = await getSessionStack()

    try {
      // Commit and push Git changes
      await this.git.save(this.editor!, encryptSecrets, files)
      // Pull the latest changes to ensure we have the most recent state
      await rootStack.git.git.pull()

      for (const aplRecord of aplRecords) {
        rootStack.fileStore.set(aplRecord.filePath, aplRecord.content)
      }

      debug(`Updated root stack values with ${this.sessionId} changes`)
    } catch (e) {
      e.message = getSanitizedErrorMessage(e)
      throw e
    } finally {
      // Clean up the session
      await cleanSession(this.sessionId!)
    }
  }

  async doDeployment(aplRecord: AplRecord, encryptSecrets = true, files?: string[]): Promise<void> {
    const rootStack = await getSessionStack()

    try {
      // Commit and push Git changes
      await this.git.save(this.editor!, encryptSecrets, files)
      // Pull the latest changes to ensure we have the most recent state
      await rootStack.git.git.pull()

      rootStack.fileStore.set(aplRecord.filePath, aplRecord.content)

      debug(`Updated root stack values with ${this.sessionId} changes`)
    } catch (e) {
      e.message = getSanitizedErrorMessage(e)
      throw e
    } finally {
      // Clean up the session
      await cleanSession(this.sessionId!)
    }
  }

  async doDeleteDeployment(filePaths: string[]): Promise<void> {
    const rootStack = await getSessionStack()

    try {
      // Commit and push Git changes
      await this.git.save(this.editor!, false)
      // Pull the latest changes to ensure we have the most recent state
      await rootStack.git.git.pull()

      for (const filePath of filePaths) {
        rootStack.fileStore.delete(filePath)
      }

      debug(`Updated root stack values with ${this.sessionId} changes`)
    } catch (e) {
      e.message = getSanitizedErrorMessage(e)
      throw e
    } finally {
      // Clean up the session
      await cleanSession(this.sessionId!)
    }
  }

  apiClient?: CoreV1Api

  getApiClient(): CoreV1Api {
    if (this.apiClient) return this.apiClient
    const kc = new KubeConfig()
    kc.loadFromDefault()
    this.apiClient = kc.makeApiClient(CoreV1Api)
    return this.apiClient
  }

  async getK8sPodLabelsForWorkload(workloadName: string, namespace?: string): Promise<Record<string, string>> {
    console.log('Fetching pod labels for workload', workloadName, namespace)
    const api = this.getApiClient()
    const istioKey = 'service.istio.io/canonical-name'
    const otomiKey = 'otomi.io/app'
    const instanceKey = 'app.kubernetes.io/instance'
    const nameKey = 'app.kubernetes.io/name'

    // Helper to list pods by label selector
    const listPods = async (labelSelector: string) =>
      namespace
        ? await api.listNamespacedPod({ namespace, labelSelector })
        : await api.listPodForAllNamespaces({ labelSelector })

    // 1. Primary selector: Istio canonical name
    let selector = `${istioKey}=${workloadName}`
    let res = await listPods(selector)
    let pods = res.items

    // 2. RabbitMQ fallback: workloadName-rabbitmq-cluster
    if (pods.length === 0) {
      selector = `${istioKey}=${workloadName}-rabbitmq-cluster`
      res = await listPods(selector)
      pods = res.items
    }

    // 3. Otomi app label
    if (pods.length === 0) {
      selector = `${otomiKey}=${workloadName}`
      res = await listPods(selector)
      pods = res.items
    }

    // 4. app.kubernetes.io/instance
    if (pods.length === 0) {
      selector = `${instanceKey}=${workloadName}`
      res = await listPods(selector)
      pods = res.items
    }

    // 5. app.kubernetes.io/name
    if (pods.length === 0) {
      selector = `${nameKey}=${workloadName}`
      res = await listPods(selector)
      pods = res.items
    }

    const excludedLabels = ['helm.sh/chart', 'app.kubernetes.io/managed-by']
    const filteredLabels = Object.fromEntries(
      Object.entries(pods[0]?.metadata?.labels ?? {}).filter(([key]) => !excludedLabels.includes(key)),
    )
    // Return labels of the first matching pod, or empty object
    return pods.length > 0 ? filteredLabels : {}
  }

  async listUniquePodNamesByLabel(labelSelector: string, namespace?: string): Promise<string[]> {
    const api = this.getApiClient()

    // fetch pods, either namespaced or all
    const res = namespace
      ? await api.listNamespacedPod({ namespace, labelSelector })
      : await api.listPodForAllNamespaces({ labelSelector })

    const allPods = res.items
    if (allPods.length === 0) return []

    const seenBases = new Set<string>()
    const names: string[] = []

    for (const pod of allPods) {
      const fullName = pod.metadata?.name || ''
      // derive “base” by stripping off the last dash-segment
      const base = fullName.includes('-') ? fullName.substring(0, fullName.lastIndexOf('-')) : fullName

      if (!seenBases.has(base)) {
        seenBases.add(base)
        names.push(fullName)
      }
    }

    return names
  }

  async getAllAIModels(): Promise<AplAIModelResponse[]> {
    return getAIModels()
  }

  async getK8sServices(teamId: string): Promise<Array<K8sService>> {
    if (env.isDev) return []

    const client = this.getApiClient()
    const collection: K8sService[] = []

    const svcList = await client.listNamespacedService({ namespace: `team-${teamId}` })
    svcList.items.map((item) => {
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

  async getKubecfg(teamId: string): Promise<KubeConfig> {
    this.getTeam(teamId) // will throw if not existing
    const {
      cluster: { name, apiName = `otomi-${name}`, apiServer },
    } = this.getSettings(['cluster']) as Record<string, any>
    if (!apiServer) throw new ValidationError('Missing configuration value: cluster.apiServer')
    const client = this.getApiClient()
    const namespace = `team-${teamId}`
    const sa = await client.readNamespacedServiceAccount({ name: `kubectl`, namespace })
    const { secrets }: { secrets?: Array<V1ObjectReference> } = sa
    const secretName = secrets?.length ? secrets[0].name : ''
    const secret = await client.readNamespacedSecret({ name: secretName || '', namespace })
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
    const config = new KubeConfig()
    config.loadFromOptions(options)
    return config
  }

  async getDockerConfig(teamId: string): Promise<string> {
    this.getTeam(teamId) // will throw if not existing
    const client = this.getApiClient()
    const namespace = `team-${teamId}`
    const secretName = 'harbor-pushsecret'
    const secret = await client.readNamespacedSecret({ name: secretName, namespace })
    return Buffer.from(secret.data!['.dockerconfigjson'], 'base64').toString('ascii')
  }

  async createSealedSecret(teamId: string, data: SealedSecret): Promise<SealedSecret> {
    const newSecret = await this.createAplSealedSecret(
      teamId,
      getAplObjectFromV1('AplTeamSecret', data) as AplSecretRequest,
    )
    return getV1ObjectFromApl(newSecret) as SealedSecret
  }

  async createAplSealedSecret(teamId: string, data: AplSecretRequest): Promise<AplSecretResponse> {
    if (data.metadata.name.length < 2) throw new ValidationError('Secret name must be at least 2 characters long')
    if (this.fileStore.getTeamResource(data.kind, teamId, data.metadata.name)) {
      throw new AlreadyExists('SealedSecret name already exists')
    }
    const aplRecord = await this.saveTeamSealedSecret(teamId, data)
    await this.doDeployment(aplRecord, false)
    return aplRecord.content as AplSecretResponse
  }

  async editSealedSecret(teamId: string, name: string, data: SealedSecret): Promise<SealedSecret> {
    const mergeObj = getV1MergeObject(data) as DeepPartial<AplSecretRequest>
    const mergedSecret = await this.editAplSealedSecret(teamId, name, mergeObj)
    return getV1ObjectFromApl(mergedSecret) as SealedSecret
  }

  async editAplSealedSecret(
    teamId: string,
    name: string,
    data: DeepPartial<AplSecretRequest>,
    patch = false,
  ): Promise<AplSecretResponse> {
    const existing = await this.getAplSealedSecret(teamId, name)
    const namespace = data.spec?.namespace ?? existing.spec.namespace ?? `team-${teamId}`

    const updatedSpec = patch
      ? merge(cloneDeep(existing.spec), {
          encryptedData: data.spec?.encryptedData,
          namespace,
        })
      : ({
          ...existing.spec,
          encryptedData: data.spec?.encryptedData,
          namespace,
          immutable: data.spec?.immutable ?? existing.spec.immutable,
          metadata: data.spec?.metadata ?? existing.spec.metadata,
        } as SealedSecret)

    const aplRecord = await this.saveTeamSealedSecret(teamId, {
      kind: existing.kind,
      metadata: existing.metadata,
      spec: updatedSpec,
    })
    await this.doDeployment(aplRecord, false)
    return aplRecord.content as AplSecretResponse
  }

  async deleteSealedSecret(teamId: string, name: string): Promise<void> {
    const filePath = this.fileStore.deleteTeamResource('AplTeamSecret', teamId, name)
    await this.git.removeFile(filePath)
    await this.doDeleteDeployment([filePath])
  }

  async getSealedSecret(teamId: string, name: string): Promise<SealedSecret> {
    const aplSecret = await this.getAplSealedSecret(teamId, name)
    return getV1ObjectFromApl(aplSecret) as SealedSecret
  }

  async getAplSealedSecret(teamId: string, name: string): Promise<AplSecretResponse> {
    const sealedSecret = this.fileStore.getTeamResource('AplTeamSecret', teamId, name)
    if (!sealedSecret) {
      throw new NotExistError(`SealedSecret ${name} not found in team ${teamId}`)
    }
    return toSealedSecretResponse(sealedSecret as SealedSecretManifestType)
  }

  getAllSealedSecrets(): SealedSecret[] {
    return this.getAllAplSealedSecrets().map(getV1ObjectFromApl) as SealedSecret[]
  }

  getAllAplSealedSecrets(): AplSecretResponse[] {
    const files = this.fileStore.getAllTeamResourcesByKind('AplTeamSecret')
    return Array.from(files.values()).map((secret) => toSealedSecretResponse(secret as SealedSecretManifestType))
  }

  getSealedSecrets(teamId: string): SealedSecret[] {
    return this.getAplSealedSecrets(teamId).map((secret) => ({
      ...getV1ObjectFromApl(secret),
      teamId,
    })) as SealedSecret[]
  }

  getAplSealedSecrets(teamId: string): AplSecretResponse[] {
    const files = this.fileStore.getTeamResourcesByKindAndTeamId('AplTeamSecret', teamId)
    return Array.from(files.values()).map((secret) => toSealedSecretResponse(secret as SealedSecretManifestType))
  }

  async getSecretsFromK8s(teamId: string): Promise<Array<string>> {
    if (env.isDev) return []
    return await getTeamSecretsFromK8s(`team-${teamId}`)
  }

  async createAplKnowledgeBase(teamId: string, data: AplKnowledgeBaseRequest): Promise<AplKnowledgeBaseResponse> {
    if (data.metadata.name.length < 2)
      throw new ValidationError('Knowledge base name must be at least 2 characters long')
    if (this.fileStore.getTeamResource('AkamaiKnowledgeBase', teamId, data.metadata.name)) {
      throw new AlreadyExists('Knowledge base name already exists')
    }

    const teamObject = toTeamObject(teamId, data)
    const aplRecord = await this.saveTeamKnowledgeBase(teamObject)
    await this.doDeployment(aplRecord, false)
    return aplRecord.content as AplKnowledgeBaseResponse
  }

  async editAplKnowledgeBase(
    teamId: string,
    name: string,
    data: DeepPartial<AplKnowledgeBaseRequest>,
    patch = false,
  ): Promise<AplKnowledgeBaseResponse> {
    const existing = await this.getAplKnowledgeBase(teamId, name)

    const updatedSpec = patch
      ? merge(cloneDeep(existing.spec), data.spec)
      : {
          modelName: data.spec?.modelName ?? existing.spec.modelName,
          sourceUrl: data.spec?.sourceUrl ?? existing.spec.sourceUrl,
        }

    const teamObject = buildTeamObject(existing, updatedSpec)

    const aplRecord = await this.saveTeamKnowledgeBase(teamObject)
    await this.doDeployment(aplRecord, false)
    return aplRecord.content as AplKnowledgeBaseResponse
  }

  async deleteAplKnowledgeBase(teamId: string, name: string): Promise<void> {
    const filePath = this.fileStore.deleteTeamResource('AkamaiKnowledgeBase', teamId, name)
    const relativePath = getTeamKnowledgeBaseValuesFilePath(teamId, `${name}.yaml`)
    const databasePath = getTeamDatabaseValuesFilePath(teamId, `${name}.yaml`)
    await this.git.removeFile(relativePath)
    await this.git.removeFile(databasePath)
    await this.doDeleteDeployment([filePath])
  }

  async getAplKnowledgeBase(teamId: string, name: string): Promise<AplKnowledgeBaseResponse> {
    const knowledgeBase = this.fileStore.getTeamResource('AkamaiKnowledgeBase', teamId, name)
    if (!knowledgeBase) {
      throw new NotExistError(`Knowledge base ${name} not found in team ${teamId}`)
    }
    return AkamaiKnowledgeBaseCR.fromCR(knowledgeBase).toApiResponse(teamId)
  }

  async getAplKnowledgeBases(teamId: string): Promise<AplKnowledgeBaseResponse[]> {
    const knowledgeBases = await listAkamaiKnowledgeBaseCRs(`team-${teamId}`)
    return knowledgeBases.map((kb) => AkamaiKnowledgeBaseCR.fromCR(kb).toApiResponse(teamId, kb.status))
  }

  private async saveTeamKnowledgeBase(aplTeamObject: AplTeamObject): Promise<AplRecord> {
    const { metadata } = aplTeamObject
    const teamId = metadata.labels['apl.io/teamId']
    const databaseCR = await DatabaseCR.create(teamId, metadata.name)

    const filePath = this.fileStore.setTeamResource(aplTeamObject)
    await this.git.writeFile(filePath, aplTeamObject)
    await this.saveDatabaseCR(teamId, databaseCR)

    return { filePath, content: aplTeamObject }
  }

  async createAplAgent(teamId: string, data: AplAgentRequest): Promise<AplAgentResponse> {
    if (data.metadata.name.length < 2) throw new ValidationError('Agent name must be at least 2 characters long')
    if (this.fileStore.getTeamResource('AkamaiAgent', teamId, data.metadata.name)) {
      throw new AlreadyExists('Agent name already exists')
    }
    const teamObject = toTeamObject(teamId, data)
    const aplRecord = await this.saveTeamConfigItem(teamObject)
    await this.doDeployment(aplRecord, false)
    return aplRecord.content as AplAgentResponse
  }

  async editAplAgent(
    teamId: string,
    name: string,
    data: DeepPartial<AplAgentRequest>,
    patch = false,
  ): Promise<AplAgentResponse> {
    const existing = this.getAplAgent(teamId, name)
    const updatedSpec = patch
      ? merge(cloneDeep(existing.spec), data.spec)
      : {
          foundationModel: data.spec?.foundationModel ?? existing.spec.foundationModel,
          foundationModelEndpoint: data.spec?.foundationModelEndpoint ?? existing.spec.foundationModelEndpoint,
          temperature: data.spec?.temperature ?? existing.spec.temperature,
          topP: data.spec?.topP ?? existing.spec.topP,
          maxTokens: data.spec?.maxTokens ?? existing.spec.maxTokens,
          agentInstructions: data.spec?.agentInstructions ?? existing.spec.agentInstructions,
          routes: (data.spec?.routes ?? existing.spec.routes) as typeof existing.spec.routes,
          tools: (data.spec?.tools ?? existing.spec.tools) as typeof existing.spec.tools,
        }

    const teamObject = buildTeamObject(existing, updatedSpec)

    const aplRecord = await this.saveTeamConfigItem(teamObject)
    await this.doDeployment(aplRecord, false)
    return aplRecord.content as AplAgentResponse
  }

  async deleteAplAgent(teamId: string, name: string): Promise<void> {
    const filePath = this.fileStore.deleteTeamResource('AkamaiAgent', teamId, name)

    await this.git.removeFile(filePath)
    await this.doDeleteDeployment([filePath])
  }

  getAplAgent(teamId: string, name: string): AplAgentResponse {
    const agent = this.fileStore.getTeamResource('AkamaiAgent', teamId, name)
    if (!agent) {
      throw new NotExistError(`Agent ${name} not found in team ${teamId}`)
    }
    return AkamaiAgentCR.fromCR(agent).toApiResponse(teamId)
  }

  async getAplAgents(teamId: string): Promise<AplAgentResponse[]> {
    const agents = await listAkamaiAgentCRs(`team-${teamId}`)
    return agents.map((agent) => AkamaiAgentCR.fromCR(agent).toApiResponse(teamId, agent.status))
  }

  getAllAplAgents(): AplAgentResponse[] {
    const files = this.fileStore.getAllTeamResourcesByKind('AkamaiAgent')
    return Array.from(files.values()) as AplAgentResponse[]
  }

  private async saveDatabaseCR(teamId: string, databaseCR: DatabaseCR) {
    const dbPath = getTeamDatabaseValuesFilePath(teamId, `${databaseCR.metadata.name}.yaml`)
    await this.git.writeFile(dbPath, databaseCR.toRecord())
  }

  async loadValues(): Promise<Promise<Promise<Promise<Promise<void>>>>> {
    debug('Loading values')
    await this.git.initSops()
    await this.initRepo()
    this.isLoaded = true
  }

  private buildSecretObject(aplObject: AplTeamObject | AplPlatformObject, secretSpec: Record<string, any>): AplObject {
    return {
      kind: aplObject.kind,
      metadata: aplObject.metadata,
      spec: omit(secretSpec, ['id', 'teamId', 'name']),
    }
  }

  private extractAppSecretPaths(appName: string, globalPaths: string[]): string[] {
    const appPrefix = `apps.${appName}.`
    return globalPaths.filter((path) => path.startsWith(appPrefix)).map((path) => path.replace(appPrefix, ''))
  }

  private extractSettingsSecretPaths(kind: AplKind, globalPaths: string[]): string[] {
    const settingsPrefixMap: Record<string, string> = {
      AplDns: 'dns.',
      AplKms: 'kms.',
      AplSmtp: 'smtp.',
      AplIdentityProvider: 'oidc.',
      AplCapabilitySet: 'otomi.',
      AplAlertSet: 'alerts.',
      AplObjectStorage: 'obj.',
    }

    const prefix = settingsPrefixMap[kind]
    if (!prefix) return []

    return globalPaths.filter((path) => path.startsWith(prefix)).map((path) => path.replace(prefix, ''))
  }

  private extractTeamSecretPaths(globalPaths: string[]): string[] {
    // Team paths use pattern: teamConfig.patternProperties.^[a-z0-9]([-a-z0-9]*[a-z0-9])+$.settings.{field}
    const teamPattern = 'teamConfig.patternProperties.^[a-z0-9]([-a-z0-9]*[a-z0-9])+$.settings.'

    return globalPaths.filter((path) => path.startsWith(teamPattern)).map((path) => path.replace(teamPattern, ''))
  }

  private async saveWithSecrets(
    aplObject: AplTeamObject | AplPlatformObject,
    secretPaths: string[],
  ): Promise<AplRecord> {
    const secretData = {}
    const specWithoutSecrets = cloneDeep(aplObject.spec)
    secretPaths.forEach((secretPath) => {
      const secretValue = get(aplObject.spec, secretPath)
      if (secretValue) {
        set(secretData, secretPath, secretValue)
        unset(specWithoutSecrets, secretPath)
      }
    })

    // Determine file path and save using appropriate FileStore method
    let filePath: string
    if ('labels' in aplObject.metadata && 'apl.io/teamId' in aplObject.metadata.labels) {
      // Store full object with secrets.
      // TODO check if this is needed.
      filePath = this.fileStore.setTeamResource(aplObject as AplTeamObject)
    } else {
      // Store full object with secrets.
      // TODO check if this is needed.
      filePath = this.fileStore.setPlatformResource(aplObject as AplPlatformObject)
    }

    // Write main file
    await this.git.writeFile(filePath, { ...aplObject, spec: specWithoutSecrets })

    // Write secrets file if there are any secrets
    if (Object.keys(secretData).length > 0) {
      const secretFilePath = getSecretFilePath(filePath)
      // Build proper AplObject structure for secret file
      const secretObject = this.buildSecretObject(aplObject, secretData)
      await this.git.writeFile(secretFilePath, secretObject)
    }

    return { filePath, content: aplObject }
  }
  async saveAppToggle(app: AplObject): Promise<void> {
    const globalPaths = getSecretPaths()
    const appSecretPaths = this.extractAppSecretPaths(app.metadata.name, globalPaths)
    await this.saveWithSecrets(app, appSecretPaths)
  }

  async saveAdminApp(app: App, secretPaths?: string[]): Promise<void> {
    const { id, enabled, values, rawValues } = app
    const spec: Record<string, any> = {
      ...(values || {}),
    }

    if (!isEmpty(rawValues)) {
      spec._rawValues = rawValues
    }

    if (this.canToggleApp(id)) {
      spec.enabled = !!enabled
    }

    const aplPlatformObject = buildPlatformObject('AplApp', id, spec)

    const globalPaths = secretPaths ?? getSecretPaths()
    const appSecretPaths = this.extractAppSecretPaths(id, globalPaths)

    await this.saveWithSecrets(aplPlatformObject, appSecretPaths)
  }

  async saveSettings(secretPaths?: string[]): Promise<void> {
    const settings = cloneDeep(this.getSettings()) as Record<string, Record<string, any>>
    settings.otomi.nodeSelector = arrayToObject(settings.otomi.nodeSelector as [])

    // Get all settings file maps
    const settingsFileMaps = getSettingsFileMaps('')
    const globalPaths = secretPaths ?? getSecretPaths()

    // Save each setting as a separate AplPlatformObject
    for (const [settingName, fileMap] of settingsFileMaps.entries()) {
      const settingValue = settings[settingName]
      if (settingValue) {
        const aplPlatformObject = buildPlatformObject(fileMap.kind, settingName, settingValue)
        const settingsSecretPaths = this.extractSettingsSecretPaths(fileMap.kind, globalPaths)
        await this.saveWithSecrets(aplPlatformObject, settingsSecretPaths)
      }
    }
  }

  async saveUser(user: User): Promise<AplRecord> {
    debug(`Saving user ${user.email}`)

    if (!user.id) {
      throw new Error('User id not set')
    }
    const aplPlatformObject = buildPlatformObject('AplUser', user.id, user as unknown as Record<string, any>)
    const filePath = this.fileStore.setPlatformResource(aplPlatformObject)

    // Save all values to secrets files as users do not have main file
    const secretObject = this.buildSecretObject(aplPlatformObject, user as unknown as Record<string, any>)
    const secretFilePath = getSecretFilePath(filePath)
    await this.git.writeFile(secretFilePath, secretObject)

    return { filePath, content: aplPlatformObject }
  }

  async deleteUserFile(userId: string): Promise<void> {
    debug(`Deleting user ${userId}`)
    const filePath = getResourceFilePath('AplUser', userId)

    this.fileStore.delete(filePath)

    await this.git.removeFile(filePath)

    const secretFilePath = getSecretFilePath(filePath)
    const secretExists = await this.git.fileExists(secretFilePath)
    if (secretExists) {
      await this.git.removeFile(secretFilePath)
    }
  }

  async saveTeam(aplTeamObject: AplTeamObject, secretPaths?: string[]): Promise<AplRecord> {
    const teamId = aplTeamObject.metadata.labels['apl.io/teamId']
    debug(`Saving team ${teamId}`)

    const globalPaths = secretPaths ?? getSecretPaths()
    const teamSecretPaths = this.extractTeamSecretPaths(globalPaths)

    return await this.saveWithSecrets(aplTeamObject, teamSecretPaths)
  }

  async deleteTeamObjects(name: string): Promise<string[]> {
    // Delete all files for this team from file store
    const teamPrefix = `env/teams/${name}/`
    const filePaths: string[] = []
    for (const key of this.fileStore.keys()) {
      if (key.startsWith(teamPrefix)) {
        this.fileStore.delete(key)
        filePaths.push(key)
      }
    }
    const teamDir = `env/teams/${name}`
    await this.git.removeDir(teamDir)
    return filePaths
  }

  transformService(service: AplServiceResponse): Record<string, any> {
    const serviceSpec = service.spec
    const serviceMeta = {
      name: service.metadata.name,
      teamId: service.metadata.labels['apl.io/teamId'],
    }
    const publicIngressFields = [
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
    ]
    const inService = omit(serviceSpec, publicIngressFields)

    const { cluster, dns } = this.getSettings(['cluster', 'dns'])
    const managedByKnative = service.spec.ksvc?.predeployed ? true : false
    const url = getServiceUrl({
      domain: serviceSpec.domain,
      name: service.metadata.name,
      teamId: service.metadata.labels['apl.io/teamId'],
      cluster,
      dns,
      managedByKnative,
    })
    return removeBlankAttributes({
      ...serviceMeta,
      ...inService,
      ingress: {
        ...pick(serviceSpec, publicIngressFields),
        domain: url.domain,
        subdomain: url.subdomain,
        useDefaultHost: !serviceSpec.domain && serviceSpec.ownHost,
      },
    })
  }

  convertDbServiceToValues(svc: Service): ServiceSpec {
    const { name } = svc
    const svcCommon = omit(svc, ['name', 'ingress', 'path'])
    if (svc.ingress?.type === 'public') {
      const { ingress } = svc
      const domain = ingress.subdomain ? `${ingress.subdomain}.${ingress.domain}` : ingress.domain
      return {
        name,
        ...svcCommon,
        ...pick(ingress, [
          'hasCert',
          'certName',
          'paths',
          'forwardPath',
          'tlsPass',
          'ingressClassName',
          'headers',
          'useCname',
          'cname',
        ]),
        ownHost: ingress.useDefaultHost,
        domain: ingress.useDefaultHost ? undefined : domain,
      }
    } else {
      return {
        name,
        ...svcCommon,
      }
    }
  }

  private getVersions(currentSha: string): Record<string, string> {
    const { otomi } = this.getSettings(['otomi'])
    return {
      core: otomi?.version ?? env.VERSIONS.core,
      api: env.VERSIONS.api ?? process.env.npm_package_version!,
      console: env.VERSIONS.console,
      values: currentSha,
    }
  }

  async getSession(user: k8sUser): Promise<Session> {
    const rootStack = await getSessionStack()
    const valuesSchema = await getValuesSchema()
    const currentSha = rootStack.git.commitSha
    const { obj } = this.getSettings(['obj'])
    let regions
    try {
      regions = await getRegions()
    } catch (error) {
      debug('Error fetching object storage regions:', error.message)
    }
    const objStorageRegions =
      regions?.data
        ?.filter((region) => region.capabilities.includes('Object Storage'))
        ?.map(({ id, label }) => ({ id, label }))
        ?.sort((a, b) => a.label.localeCompare(b.label)) || []
    const data: Session = {
      ca: env.CUSTOM_ROOT_CA,
      core: this.getCore() as Record<string, any>,
      corrupt: rootStack.git.corrupt,
      editor: this.editor,
      inactivityTimeout: env.EDITOR_INACTIVITY_TIMEOUT,
      sealedSecretsPEM: await getSealedSecretsPEM(),
      user: user as SessionUser,
      defaultPlatformAdminEmail: env.DEFAULT_PLATFORM_ADMIN_EMAIL,
      objectStorage: {
        showWizard: obj?.showWizard ?? true,
        objStorageApps: env.OBJ_STORAGE_APPS,
        objStorageRegions,
      },
      versions: this.getVersions(currentSha),
      valuesSchema,
    }
    return data
  }
}
