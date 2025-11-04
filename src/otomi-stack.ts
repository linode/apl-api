import { CoreV1Api, KubeConfig, User as k8sUser, V1ObjectReference } from '@kubernetes/client-node'
import Debug from 'debug'

import { getRegions, ObjectStorageKeyRegions } from '@linode/api-v4'
import { existsSync, rmSync } from 'fs'
import { pathExists, unlink } from 'fs-extra'
import { readdir, readFile, writeFile } from 'fs/promises'
import { generate as generatePassword } from 'generate-password'
import { cloneDeep, filter, isEmpty, map, mapValues, merge, omit, pick, set, unset } from 'lodash'
import { getAppList, getAppSchema, getSpec } from 'src/app'
import { AlreadyExists, ForbiddenError, HttpError, OtomiError, PublicUrlExists, ValidationError } from 'src/error'
import getRepo, { getWorktreeRepo, Git } from 'src/git'
import { cleanSession, getSessionStack } from 'src/middleware'
import {
  AplAgentRequest,
  AplAgentResponse,
  AplAIModelResponse,
  AplBackupRequest,
  AplBackupResponse,
  AplBuildRequest,
  AplBuildResponse,
  AplCodeRepoRequest,
  AplCodeRepoResponse,
  AplKind,
  AplKnowledgeBaseRequest,
  AplKnowledgeBaseResponse,
  AplNetpolRequest,
  AplNetpolResponse,
  AplPolicyRequest,
  AplPolicyResponse,
  AplResponseObject,
  AplSecretRequest,
  AplSecretResponse,
  AplServiceRequest,
  AplServiceResponse,
  AplTeamSettingsRequest,
  AplTeamSettingsResponse,
  AplWorkloadRequest,
  AplWorkloadResponse,
  App,
  Backup,
  Build,
  Cloudtty,
  CodeRepo,
  Core,
  DeepPartial,
  K8sService,
  Netpol,
  ObjWizard,
  Policies,
  Policy,
  Repo,
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
import { getFileMaps, loadValues } from './repo'
import { RepoService } from './services/RepoService'
import { TeamConfigService } from './services/TeamConfigService'
import { validateBackupFields } from './utils/backupUtils'
import {
  getGiteaRepoUrls,
  getPrivateRepoBranches,
  getPublicRepoBranches,
  normalizeRepoUrl,
  testPrivateRepoConnect,
  testPublicRepoConnect,
} from './utils/codeRepoUtils'
import { getAplObjectFromV1, getV1MergeObject, getV1ObjectFromApl } from './utils/manifests'
import { getSealedSecretsPEM, sealedSecretManifest, SealedSecretManifestType } from './utils/sealedSecretUtils'
import { getKeycloakUsers, isValidUsername } from './utils/userUtils'
import { ObjectStorageClient } from './utils/wizardUtils'
import { fetchChartYaml, fetchWorkloadCatalog, NewHelmChartValues, sparseCloneChart } from './utils/workloadUtils'
import { getAIModels } from './ai/aiModelHandler'
import { AkamaiKnowledgeBaseCR } from './ai/AkamaiKnowledgeBaseCR'
import { AkamaiAgentCR } from './ai/AkamaiAgentCR'
import { DatabaseCR } from './ai/DatabaseCR'

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
//TODO Move this to the repo.ts
const clusterSettingsFilePath = 'env/settings/cluster.yaml'

function getTeamSealedSecretsValuesFilePath(teamId: string, sealedSecretsName: string): string {
  return `env/teams/${teamId}/sealedsecrets/${sealedSecretsName}`
}

function getTeamKnowledgeBaseValuesFilePath(teamId: string, knowledgeBaseName: string): string {
  return `env/teams/${teamId}/knowledgebases/${knowledgeBaseName}`
}

function getTeamAgentValuesFilePath(teamId: string, agentName: string): string {
  return `env/teams/${teamId}/agents/${agentName}`
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

    return Object.entries(appsObj).map(([appId, appData]) => {
      // Retrieve schema to check if the `enabled` flag should be considered
      const appSchema = getAppSchema(appId)
      const isEnabled = appSchema?.properties?.enabled ? !!appData.enabled : undefined

      return {
        id: appId,
        enabled: isEnabled,
        values: omit(appData, ['enabled']),
        rawValues: {},
      }
    })
  }

  transformPolicies(teamId: string, policies: Record<string, Policy>): AplPolicyResponse[] {
    return Object.entries(policies).map(([name, policy]) => ({
      kind: 'AplTeamPolicy',
      metadata: {
        name,
        labels: {
          'apl.io/teamId': teamId,
        },
      },
      spec: policy,
      status: {},
    }))
  }

  transformSecrets(teamId: string, secrets: SealedSecretManifestType[]): AplSecretResponse[] {
    return secrets.map((secret) => {
      const { annotations, labels, finalizers } = secret.spec.template?.metadata || {}
      return {
        kind: 'AplTeamSecret',
        metadata: {
          name: secret.metadata.name,
          labels: {
            'apl.io/teamId': teamId,
          },
        },
        spec: {
          encryptedData: secret.spec.encryptedData,
          type: secret.spec.template?.type || 'kubernetes.io/opaque',
          immutable: secret.spec.template?.immutable ?? false,
          namespace: secret.spec.template?.metadata?.namespace,
          metadata: {
            ...(!isEmpty(annotations) && { annotations }),
            ...(!isEmpty(labels) && { labels }),
            ...(!isEmpty(finalizers) && { finalizers }),
          },
        },
        status: {},
      }
    })
  }

  transformWorkloads(workloads: AplWorkloadResponse[], workloadValues: Record<string, any>[]): AplWorkloadResponse[] {
    const values = {}
    workloadValues.forEach((value) => {
      const workloadName = value.name
      if (workloadName) {
        values[workloadName] = value.values
      }
    })
    return workloads.map((workload) => {
      return merge(workload, { spec: { values: values[workload.metadata.name] } })
    })
  }

  transformTeamSettings(teamSettings: Team) {
    if (teamSettings.id && !teamSettings.name) {
      // eslint-disable-next-line no-param-reassign
      teamSettings.name = teamSettings.id
    }
    // Always allow Alertmanager and Grafana for team Admin
    if (teamSettings.name === 'admin' && teamSettings.managedMonitoring) {
      // eslint-disable-next-line no-param-reassign
      teamSettings.managedMonitoring.alertmanager = true
      // eslint-disable-next-line no-param-reassign
      teamSettings.managedMonitoring.grafana = true
    }
    return teamSettings
  }

  async initRepo(repoService?: RepoService): Promise<void> {
    if (repoService) {
      this.repoService = repoService
      return
    } else {
      // We need to map the app values, so it adheres the App interface
      const rawRepo = await loadValues(this.getRepoPath())

      rawRepo.apps = this.transformApps(rawRepo.apps)
      rawRepo.teamConfig = mapValues(rawRepo.teamConfig, (teamConfig, teamName) => ({
        ...omit(teamConfig, 'workloadValues'),
        apps: this.transformApps(teamConfig.apps),
        policies: this.transformPolicies(teamName, teamConfig.policies || {}),
        sealedsecrets: this.transformSecrets(teamName, teamConfig.sealedsecrets || []),
        workloads: this.transformWorkloads(teamConfig.workloads || [], teamConfig.workloadValues || []),
        settings: this.transformTeamSettings(teamConfig.settings),
      }))

      const repo = rawRepo as Repo
      this.repoService = new RepoService(repo)
    }
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

    debug(`Worktree created for ${this.editor} in ${this.sessionId}`)
  }

  getSecretPaths(): string[] {
    // we split secrets from plain data, but have to overcome teams using patternproperties
    const teamProp = 'teamConfig.patternProperties.^[a-z0-9]([-a-z0-9]*[a-z0-9])+$'
    const teams = this.getTeams().map(({ name }) => name)
    const cleanSecretPaths: string[] = []
    const { secretPaths } = getSpec()
    secretPaths.map((p) => {
      if (p.indexOf(teamProp) === -1 && !cleanSecretPaths.includes(p)) {
        cleanSecretPaths.push(p)
      } else {
        teams.forEach((teamId: string) => {
          if (p.indexOf(teamProp) === 0) {
            cleanSecretPaths.push(
              p
                .replace(teamProp, `teamConfig.${teamId}`)
                // add spec to the path for v2 endpoints
                .replace(`teamConfig.${teamId}.settings`, `teamConfig.${teamId}.settings.spec`),
            )
          }
        })
      }
    })
    // debug('secretPaths: ', cleanSecretPaths)
    return cleanSecretPaths
  }

  getSettingsInfo(): SettingsInfo {
    return {
      cluster: pick(this.repoService.getCluster(), ['name', 'domainSuffix', 'apiServer', 'provider']),
      dns: pick(this.repoService.getDns(), ['zones']),
      otomi: pick(this.repoService.getOtomi(), ['hasExternalDNS', 'hasExternalIDP', 'isPreInstalled', 'aiEnabled']),
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
      if (cluster?.name?.includes('aplinstall')) {
        lkeClusterId = Number(cluster?.name?.replace('aplinstall', ''))
      } else if (lkeClusterId === null) {
        return { status: 'error', errorMessage: 'Cluster ID is not found in the cluster name.' }
      }
      const bucketNames = {
        cnpg: `lke${lkeClusterId}-cnpg`,
        harbor: `lke${lkeClusterId}-harbor`,
        loki: `lke${lkeClusterId}-loki`,
        tempo: `lke${lkeClusterId}-tempo`,
        velero: `lke${lkeClusterId}-velero`,
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
    const settings = this.repoService.getSettings()

    if (keys?.includes('otomi')) {
      const nodeSelector = settings.otomi?.nodeSelector
      // convert otomi.nodeSelector to array of objects
      if (!Array.isArray(nodeSelector)) {
        const nodeSelectorArray = Object.entries(nodeSelector || {}).map(([name, value]) => ({
          name,
          value,
        }))
        set(settings, 'otomi.nodeSelector', nodeSelectorArray)
      }
    }

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
    this.repoService.updateSettings(settings)
    await this.saveSettings()
    await this.doRepoDeployment((repoService) => {
      repoService.updateSettings(settings)
    })
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
    await this.saveAdminApp(app)
    await this.doRepoDeployment((repoService) => {
      repoService.updateApp(id, app)
    })
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
          await this.saveAdminApp(app)
        }
      }),
    )

    await this.doRepoDeployment((repoService) => {
      ids.map((id) => {
        const orig = repoService.getApp(id)
        if (orig && this.canToggleApp(id)) {
          repoService.updateApp(id, { enabled })
        }
      })
    })
  }

  getTeams(): Array<Team> {
    return this.repoService.getAllTeamSettings().map((team) => getV1ObjectFromApl(team) as Team)
  }

  getAplTeams(): AplTeamSettingsResponse[] {
    return this.repoService
      .getAllTeamSettings()
      .filter((t) => t.metadata.name !== 'admin')
      .map(({ spec, ...rest }) => ({
        ...rest,
        spec: { ...spec, password: undefined },
      }))
  }

  getTeamSelfServiceFlags(id: string): TeamSelfService {
    const data = this.getTeam(id)
    return data.selfService
  }

  getCore(): Core {
    return this.coreValues
  }

  getTeam(name: string): Team {
    const team = getV1ObjectFromApl(this.repoService.getTeamConfigService(name).getSettings()) as Team
    unset(team, 'password') // Remove password from the response
    return team
  }

  getAplTeam(name: string): AplTeamSettingsResponse {
    const team = this.repoService.getTeamConfigService(name).getSettings()
    unset(team, 'spec.password') // Remove password from the response
    return team
  }

  async createTeam(data: Team, deploy = true): Promise<Team> {
    const newTeam = await this.createAplTeam(
      getAplObjectFromV1('AplTeamSettingSet', data) as AplTeamSettingsRequest,
      deploy,
    )
    return getV1ObjectFromApl(newTeam) as Team
  }

  async createAplTeam(data: AplTeamSettingsRequest, deploy = true): Promise<AplTeamSettingsResponse> {
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

    const teamConfig = this.repoService.createTeamConfig(data)
    const team = teamConfig.settings
    const apps = getAppList()
    const core = this.getCore()
    const teamApps = apps.flatMap((appId) => {
      const isShared = !!core.adminApps.find((a) => a.name === appId)?.isShared
      const inTeamApps = !!core.teamApps.find((a) => a.name === appId)
      return teamName !== 'admin' && (isShared || inTeamApps)
        ? [this.repoService.getTeamConfigService(teamName).createApp({ id: appId })]
        : [] // Empty array removes `undefined` entries
    })

    if (deploy) {
      await this.saveTeam(team)
      await this.doRepoDeployment(
        (repoService) => {
          repoService.createTeamConfig(data)
          repoService.getTeamConfigService(teamName).setApps(teamApps)
        },
        true,
        [`${this.getRepoPath()}/env/teams/${teamName}/secrets.settings.yaml`],
      )
    }
    return team
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
    const team = patch
      ? this.repoService.getTeamConfigService(name).patchSettings(data)
      : this.repoService.getTeamConfigService(name).updateSettings(data)
    await this.saveTeam(team)
    await this.doTeamDeployment(
      name,
      (teamService) => {
        teamService.updateSettings(team)
      },
      true,
      [`${this.getRepoPath()}/env/teams/${name}/secrets.settings.yaml`],
    )
    return team
  }

  async deleteTeam(id: string): Promise<void> {
    await this.deleteTeamConfig(id)
    await this.doRepoDeployment((repoService) => {
      repoService.deleteTeamConfig(id)
    }, false)
  }

  private getConfigKey(kind: AplKind): string {
    return getFileMaps('').find((fm) => fm.kind === kind)!.resourceDir
  }

  async saveTeamConfigItem(data: AplResponseObject): Promise<void> {
    const { kind, metadata } = data
    const teamId = metadata.labels['apl.io/teamId']!
    const configKey = this.getConfigKey(kind)
    debug(`Saving ${kind} ${metadata.name} for team ${teamId}`)
    const repo = this.createTeamConfigInRepo(teamId, configKey, [data])
    const fileMap = getFileMaps('').find((fm) => fm.kind === kind)!
    await this.git.saveConfig(repo, fileMap)
  }

  async saveTeamWorkload(data: AplWorkloadResponse) {
    const { metadata } = data
    const teamId = metadata.labels['apl.io/teamId']!
    debug(`Saving AplTeamWorkload ${metadata.name} for team ${teamId}`)
    const workload = {
      kind: 'AplTeamWorkload',
      metadata: data.metadata,
      spec: omit(data.spec, 'values'),
    }
    const configKey = this.getConfigKey('AplTeamWorkload')
    const repo = this.createTeamConfigInRepo(teamId, configKey, [workload])
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamWorkload')!
    await this.git.saveConfig(repo, fileMap)
  }

  async saveTeamWorkloadValues(data: AplWorkloadResponse) {
    const { metadata } = data
    const teamId = metadata.labels['apl.io/teamId']!
    debug(`Saving AplTeamWorkloadValues ${metadata.name} for team ${teamId}`)
    const values = {
      name: metadata.name,
      values: data.spec.values,
    }
    const configKey = this.getConfigKey('AplTeamWorkloadValues')
    const repo = this.createTeamConfigInRepo(teamId, configKey, [values])
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamWorkloadValues')!
    await this.git.saveConfig(repo, fileMap, false)
  }

  async saveTeamPolicy(teamId: string, data: AplPolicyResponse): Promise<void> {
    debug(`Saving AplTeamPolicy for team ${teamId}`)
    const configKey = data.metadata.name
    const repo = this.createTeamConfigInRepo(teamId, configKey, data)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplTeamPolicy')!
    await this.git.saveConfig(repo, fileMap)
  }

  async saveTeamSealedSecret(data: AplSecretResponse): Promise<void> {
    const { metadata } = data
    const teamId = metadata.labels['apl.io/teamId']!
    const sealedSecretChartValues = sealedSecretManifest(data)
    const relativePath = getTeamSealedSecretsValuesFilePath(teamId, `${metadata.name}.yaml`)
    debug(`Saving sealed secrets of team: ${teamId}`)
    // @ts-ignore
    await this.git.writeFile(relativePath, sealedSecretChartValues)
  }

  async deleteTeamConfigItem(data: AplResponseObject): Promise<void> {
    const { kind, metadata } = data
    const teamId = metadata.labels['apl.io/teamId']!
    const configKey = this.getConfigKey(data.kind)
    debug(`Removing ${kind} ${metadata.name} for team ${teamId}`)
    const repo = this.createTeamConfigInRepo(teamId, configKey, [data])
    const fileMap = getFileMaps('').find((fm) => fm.kind === kind)!
    await this.git.deleteConfig(repo, fileMap)
  }

  async deleteTeamWorkload(data: AplWorkloadResponse): Promise<void> {
    const { metadata } = data
    const teamId = metadata.labels['apl.io/teamId']!
    debug(`Removing AplWorkload ${metadata.name} for team ${teamId}`)
    const repoWorkload = this.createTeamConfigInRepo(teamId, 'workloads', [data])
    const fileMapWorkload = getFileMaps('').find((fm) => fm.kind === 'AplTeamWorkload')!
    const repoValues = this.createTeamConfigInRepo(teamId, 'workloads', [data])
    const fileMapValues = getFileMaps('').find((fm) => fm.kind === 'AplTeamWorkloadValues')!
    await this.git.deleteConfig(repoWorkload, fileMapWorkload)
    await this.git.deleteConfig(repoValues, fileMapValues)
  }

  getTeamBackups(teamId: string): Backup[] {
    return this.getTeamAplBackups(teamId).map((backup) => getV1ObjectFromApl(backup) as Backup)
  }

  getTeamAplBackups(teamId: string): AplBackupResponse[] {
    return this.repoService.getTeamConfigService(teamId).getBackups()
  }

  getAllBackups(): Backup[] {
    return this.getAllAplBackups().map((backup) => getV1ObjectFromApl(backup) as Backup)
  }

  getAllAplBackups(): AplBackupResponse[] {
    return this.repoService.getAllBackups()
  }

  async createBackup(teamId: string, data: Backup): Promise<Backup> {
    const newBackup = await this.createAplBackup(teamId, getAplObjectFromV1('AplTeamBackup', data) as AplBackupRequest)
    return getV1ObjectFromApl(newBackup) as Backup
  }

  async createAplBackup(teamId: string, data: AplBackupRequest): Promise<AplBackupResponse> {
    validateBackupFields(data.metadata.name, data.spec.ttl)
    try {
      const backup = this.repoService.getTeamConfigService(teamId).createBackup(data)
      await this.saveTeamConfigItem(backup)
      await this.doTeamDeployment(
        teamId,
        (teamService) => {
          teamService.createBackup(backup)
        },
        false,
      )
      return backup
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Backup name already exists'
      throw err
    }
  }

  getBackup(teamId: string, name: string): Backup {
    return getV1ObjectFromApl(this.getAplBackup(teamId, name)) as Backup
  }

  getAplBackup(teamId: string, name: string): AplBackupResponse {
    return this.repoService.getTeamConfigService(teamId).getBackup(name)
  }

  async editBackup(teamId: string, name: string, data: Backup): Promise<Backup> {
    const mergeObj = getV1MergeObject(data) as DeepPartial<AplBackupRequest>
    const mergedBackup = await this.editAplBackup(teamId, name, mergeObj)
    return getV1ObjectFromApl(mergedBackup) as Backup
  }

  async editAplBackup(
    teamId: string,
    name: string,
    data: AplBackupRequest | DeepPartial<AplBackupRequest>,
    patch = false,
  ): Promise<AplBackupResponse> {
    validateBackupFields(data.metadata?.name, data.spec?.ttl)
    const backup = patch
      ? this.repoService.getTeamConfigService(teamId).patchBackup(name, data)
      : this.repoService.getTeamConfigService(teamId).updateBackup(name, data as AplBackupRequest)
    await this.saveTeamConfigItem(backup)
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.updateBackup(name, backup)
      },
      false,
    )
    return backup
  }

  async deleteBackup(teamId: string, name: string): Promise<void> {
    const backup = this.repoService.getTeamConfigService(teamId).getBackup(name)
    this.repoService.getTeamConfigService(teamId).deleteBackup(name)
    await this.deleteTeamConfigItem(backup)
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.deleteBackup(name)
      },
      false,
    )
  }

  getTeamNetpols(teamId: string): Netpol[] {
    return this.getTeamAplNetpols(teamId).map((netpol) => getV1ObjectFromApl(netpol) as Netpol)
  }

  getTeamAplNetpols(teamId: string): AplNetpolResponse[] {
    return this.repoService.getTeamConfigService(teamId).getNetpols()
  }

  getAllNetpols(): Netpol[] {
    return this.getAllAplNetpols().map((netpol) => getV1ObjectFromApl(netpol) as Netpol)
  }

  getAllAplNetpols(): AplNetpolResponse[] {
    return this.repoService.getAllNetpols()
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
    try {
      const netpol = this.repoService.getTeamConfigService(teamId).createNetpol(data)
      await this.saveTeamConfigItem(netpol)
      await this.doTeamDeployment(
        teamId,
        (teamService) => {
          teamService.createNetpol(netpol)
        },
        false,
      )
      return netpol
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Network policy name already exists'
      throw err
    }
  }

  getNetpol(teamId: string, name: string): Netpol {
    const netpol = this.getAplNetpol(teamId, name)
    return getV1ObjectFromApl(netpol) as Netpol
  }

  getAplNetpol(teamId: string, name: string): AplNetpolResponse {
    return this.repoService.getTeamConfigService(teamId).getNetpol(name)
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
    const netpol = patch
      ? this.repoService.getTeamConfigService(teamId).patchNetpol(name, data)
      : this.repoService.getTeamConfigService(teamId).updateNetpol(name, data as AplNetpolRequest)
    await this.saveTeamConfigItem(netpol)
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.updateNetpol(name, netpol)
      },
      false,
    )
    return netpol
  }

  async deleteNetpol(teamId: string, name: string): Promise<void> {
    const netpol = this.repoService.getTeamConfigService(teamId).getNetpol(name)
    this.repoService.getTeamConfigService(teamId).deleteNetpol(name)
    await this.deleteTeamConfigItem(netpol)
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.deleteNetpol(name)
      },
      false,
    )
  }

  getAllUsers(sessionUser: SessionUser): Array<User> {
    const users = this.repoService.getUsers()
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
      const createdUser = this.repoService.createUser(user)
      await this.saveUser(createdUser)
      await this.doRepoDeployment(
        (repoService) => {
          repoService.createUser(createdUser)
        },
        true,
        [`${this.getRepoPath()}/env/users/secrets.${createdUser.id}.yaml`],
      )
      return createdUser
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'User email already exists'
      throw err
    }
  }

  getUser(id: string, sessionUser: SessionUser): User {
    const user = this.repoService.getUser(id)
    if (sessionUser.isPlatformAdmin) {
      return user
    }
    if (sessionUser.isTeamAdmin) {
      const { id: userId, email, isPlatformAdmin, isTeamAdmin, teams } = user
      return { id: userId, email, isPlatformAdmin, isTeamAdmin, teams } as User
    }
    throw new ForbiddenError()
  }

  async editUser(id: string, data: User, sessionUser: SessionUser): Promise<User> {
    if (!sessionUser.isPlatformAdmin) {
      throw new ForbiddenError('Only platform admins can modify user details.')
    }
    const user = this.repoService.updateUser(id, data)
    await this.saveUser(user)
    await this.doRepoDeployment(
      (repoService) => {
        repoService.updateUser(id, user)
      },
      true,
      [`${this.getRepoPath()}/env/users/secrets.${user.id}.yaml`],
    )
    return user
  }

  async deleteUser(id: string): Promise<void> {
    const user = this.repoService.getUser(id)
    if (user.email === env.DEFAULT_PLATFORM_ADMIN_EMAIL) {
      throw new ForbiddenError('Cannot delete the default platform admin user')
    }
    await this.deleteUserFile(user)
    await this.doRepoDeployment((repoService) => {
      repoService.deleteUser(user.email)
    }, false)
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
    for (const user of data) {
      const existingUser = this.repoService.getUser(user.id!)
      if (
        !sessionUser.isPlatformAdmin &&
        !this.canTeamAdminUpdateUserTeams(sessionUser, existingUser, user.teams as string[])
      ) {
        throw new ForbiddenError(
          'Team admins are permitted to add or remove users only within the teams they manage. However, they cannot remove themselves or other team admins from those teams.',
        )
      }
      const updateUser = this.repoService.updateUser(user.id!, { ...existingUser, teams: user.teams })
      await this.saveUser(updateUser)
    }
    const repoUsers = this.repoService.getUsers()
    const files = repoUsers.map((user) => `${this.getRepoPath()}/env/users/secrets.${user.id}.yaml`)
    await this.doRepoDeployment(
      (repoService) => {
        for (const user of data) {
          const existingUser = repoService.getUser(user.id!)
          repoService.updateUser(user.id!, { ...existingUser, teams: user.teams })
        }
      },
      true,
      files,
    )
    const users = repoUsers.map((user) => ({ id: user.id, teams: user.teams || [] }))
    return users
  }

  getTeamCodeRepos(teamId: string): CodeRepo[] {
    return this.getTeamAplCodeRepos(teamId).map((codeRepo) => getV1ObjectFromApl(codeRepo) as CodeRepo)
  }

  getTeamAplCodeRepos(teamId: string): AplCodeRepoResponse[] {
    return this.repoService.getTeamConfigService(teamId).getCodeRepos()
  }

  getAllCodeRepos(): CodeRepo[] {
    return this.getAllAplCodeRepos().map((codeRepo) => getV1ObjectFromApl(codeRepo) as CodeRepo)
  }

  getAllAplCodeRepos(): AplCodeRepoResponse[] {
    return this.repoService.getAllCodeRepos()
  }

  async createCodeRepo(teamId: string, data: CodeRepo): Promise<CodeRepo> {
    const newCodeRepo = await this.createAplCodeRepo(
      teamId,
      getAplObjectFromV1('AplTeamCodeRepo', data) as AplCodeRepoRequest,
    )
    return getV1ObjectFromApl(newCodeRepo) as CodeRepo
  }

  async createAplCodeRepo(teamId: string, data: AplCodeRepoRequest): Promise<AplCodeRepoResponse> {
    const allRepoUrls =
      this.repoService
        .getTeamConfigService(teamId)
        .getCodeRepos()
        .map((repo) => repo.spec.repositoryUrl) || []
    if (allRepoUrls.includes(data.spec.repositoryUrl)) throw new AlreadyExists('Code repository URL already exists')
    if (!data.spec.private) unset(data.spec, 'secret')
    if (data.spec.gitService === 'gitea') unset(data.spec, 'private')
    try {
      const codeRepo = this.repoService.getTeamConfigService(teamId).createCodeRepo(data)
      await this.saveTeamConfigItem(codeRepo)
      await this.doTeamDeployment(
        teamId,
        (teamService) => {
          teamService.createCodeRepo(codeRepo)
        },
        false,
      )
      return codeRepo
    } catch (err) {
      if (err.code === 409) {
        err.publicMessage = 'Code repo name already exists'
      }
      throw err
    }
  }

  getCodeRepo(teamId: string, name: string): CodeRepo {
    return getV1ObjectFromApl(this.getAplCodeRepo(teamId, name)) as CodeRepo
  }

  getAplCodeRepo(teamId: string, name: string): AplCodeRepoResponse {
    return this.repoService.getTeamConfigService(teamId).getCodeRepo(name)
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
    const codeRepo = patch
      ? this.repoService.getTeamConfigService(teamId).patchCodeRepo(name, data)
      : this.repoService.getTeamConfigService(teamId).updateCodeRepo(name, data as AplCodeRepoRequest)
    await this.saveTeamConfigItem(codeRepo)
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.updateCodeRepo(name, codeRepo)
      },
      false,
    )
    return codeRepo
  }

  async deleteCodeRepo(teamId: string, name: string): Promise<void> {
    const codeRepo = this.repoService.getTeamConfigService(teamId).getCodeRepo(name)
    this.repoService.getTeamConfigService(teamId).deleteCodeRepo(name)
    await this.deleteTeamConfigItem(codeRepo)
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.deleteCodeRepo(name)
      },
      false,
    )
  }

  async getRepoBranches(codeRepoName: string, teamId: string): Promise<string[]> {
    if (!codeRepoName) return ['HEAD']
    const coderepo = this.getCodeRepo(teamId, codeRepoName)
    const { repositoryUrl, secret: secretName } = coderepo
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
      const repoUrl = repositoryUrl.startsWith('https://gitea')
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
    const username = gitea?.values?.adminUsername as string
    const password = (gitea?.values?.adminPassword as string) || (otomi?.adminPassword as string)
    const orgName = `team-${teamId}`
    const domainSuffix = cluster?.domainSuffix
    const internalRepoUrls = (await getGiteaRepoUrls(username, password, orgName, domainSuffix)) || []
    return internalRepoUrls
  }

  getDashboard(teamName: string): Array<any> {
    const codeRepos = teamName ? this.repoService.getTeamConfigService(teamName).getCodeRepos() : this.getAllCodeRepos()
    const builds = teamName ? this.repoService.getTeamConfigService(teamName).getBuilds() : this.getAllBuilds()
    const workloads = teamName ? this.repoService.getTeamConfigService(teamName).getWorkloads() : this.getAllWorkloads()
    const services = teamName ? this.repoService.getTeamConfigService(teamName).getServices() : this.getAllServices()
    const secrets = teamName
      ? this.repoService.getTeamConfigService(teamName).getSealedSecrets()
      : this.getAllSealedSecrets()
    const netpols = teamName ? this.repoService.getTeamConfigService(teamName).getNetpols() : this.getAllNetpols()

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
    return this.repoService.getTeamConfigService(teamId).getBuilds()
  }

  getAllBuilds(): Build[] {
    return this.getAllAplBuilds().map((build) => getV1ObjectFromApl(build) as Build)
  }

  getAllAplBuilds(): AplBuildResponse[] {
    return this.repoService.getAllBuilds()
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
    try {
      const build = this.repoService.getTeamConfigService(teamId).createBuild(data)
      await this.saveTeamConfigItem(build)
      await this.doTeamDeployment(
        teamId,
        (teamService) => {
          teamService.createBuild(build)
        },
        false,
      )
      return build
    } catch (err) {
      if (err.code === 409) {
        err.publicMessage = 'Container image name already exists, the combined image name and tag must be unique.'
      }
      throw err
    }
  }

  getBuild(teamId: string, name: string): Build {
    return getV1ObjectFromApl(this.getAplBuild(teamId, name)) as Build
  }

  getAplBuild(teamId: string, name: string): AplBuildResponse {
    return this.repoService.getTeamConfigService(teamId).getBuild(name)
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
    const build = patch
      ? this.repoService.getTeamConfigService(teamId).patchBuild(name, data)
      : this.repoService.getTeamConfigService(teamId).updateBuild(name, data as AplBuildRequest)
    await this.saveTeamConfigItem(build)
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.updateBuild(name, build)
      },
      false,
    )
    return build
  }

  async deleteBuild(teamId: string, name: string): Promise<void> {
    const build = this.repoService.getTeamConfigService(teamId).getBuild(name)
    this.repoService.getTeamConfigService(teamId).deleteBuild(name)
    await this.deleteTeamConfigItem(build)
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.deleteBuild(name)
      },
      false,
    )
  }

  getTeamPolicies(teamId: string): Policies {
    const policies = {}
    this.getTeamAplPolicies(teamId).forEach((policy) => {
      policies[policy.metadata.name] = policy.spec
    })
    return policies
  }

  getTeamAplPolicies(teamId: string): AplPolicyResponse[] {
    return this.repoService.getTeamConfigService(teamId).getPolicies()
  }

  getAllPolicies(): Record<string, Policies> {
    const teamPolicies: Record<string, Policies> = {}
    this.repoService.getTeamIds().forEach((teamId) => {
      teamPolicies[teamId] = this.getTeamPolicies(teamId)
    })
    return teamPolicies
  }

  getAllAplPolicies(): AplPolicyResponse[] {
    return this.repoService.getAllPolicies()
  }

  getPolicy(teamId: string, id: string): Policy {
    return this.getAplPolicy(teamId, id).spec
  }

  getAplPolicy(teamId: string, id: string): AplPolicyResponse {
    return this.repoService.getTeamConfigService(teamId).getPolicy(id)
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
    const policy = patch
      ? this.repoService.getTeamConfigService(teamId).patchPolicies(policyId, data)
      : this.repoService.getTeamConfigService(teamId).updatePolicies(policyId, data as AplPolicyRequest)
    await this.saveTeamPolicy(teamId, policy)
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.updatePolicies(policyId, policy)
      },
      false,
    )
    return policy
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

    try {
      const { helmCharts, catalog } = await fetchWorkloadCatalog(url, helmChartsDir, teamId)
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
    return this.repoService.getTeamConfigService(teamId).getWorkloads()
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
    return this.repoService.getAllWorkloads()
  }

  async createWorkload(teamId: string, data: Workload): Promise<Workload> {
    const newWorkload = await this.createAplWorkload(
      teamId,
      getAplObjectFromV1('AplTeamWorkload', data) as AplWorkloadRequest,
    )
    return omit(getV1ObjectFromApl(newWorkload), ['values']) as Workload
  }

  async createAplWorkload(teamId: string, data: AplWorkloadRequest): Promise<AplWorkloadResponse> {
    try {
      const workload = this.repoService.getTeamConfigService(teamId).createWorkload(data)
      await this.saveTeamWorkload(workload)
      await this.saveTeamWorkloadValues(workload)
      await this.doTeamDeployment(
        teamId,
        (teamService) => {
          teamService.createWorkload(workload)
        },
        false,
      )
      return workload
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Workload name already exists'
      throw err
    }
  }

  getWorkload(teamId: string, name: string): Workload {
    const workload = this.getAplWorkload(teamId, name)
    return omit(getV1ObjectFromApl(workload), ['values']) as Workload
  }

  getAplWorkload(teamId: string, name: string): AplWorkloadResponse {
    return this.repoService.getTeamConfigService(teamId).getWorkload(name)
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
    const workload = patch
      ? this.repoService.getTeamConfigService(teamId).patchWorkload(name, data)
      : this.repoService.getTeamConfigService(teamId).updateWorkload(name, data as AplWorkloadRequest)
    await this.saveTeamWorkload(workload)
    if (data.spec && 'values' in data.spec) {
      await this.saveTeamWorkloadValues(workload)
    }
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.updateWorkload(name, workload)
      },
      false,
    )
    return workload
  }

  async deleteWorkload(teamId: string, name: string): Promise<void> {
    const workload = this.repoService.getTeamConfigService(teamId).getWorkload(name)
    this.repoService.getTeamConfigService(teamId).deleteWorkload(name)
    await this.deleteTeamWorkload(workload)
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.deleteWorkload(name)
      },
      false,
    )
  }

  async editWorkloadValues(teamId: string, name: string, data: WorkloadValues): Promise<WorkloadValues> {
    const workload = this.repoService.getTeamConfigService(teamId).patchWorkload(name, {
      spec: {
        values: stringifyYaml(deepQuote(data.values)),
      },
    })
    await this.saveTeamWorkloadValues(workload)
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.updateWorkload(name, workload)
      },
      false,
    )
    return merge(pick(getV1ObjectFromApl(workload), ['id', 'teamId', 'name']), {
      values: data.values || undefined,
    }) as WorkloadValues
  }

  getWorkloadValues(teamId: string, name: string): WorkloadValues {
    const workload = this.getAplWorkload(teamId, name)
    return merge(pick(getV1ObjectFromApl(workload), ['id', 'teamId', 'name']), {
      values: workload.spec.values || undefined,
    }) as WorkloadValues
  }

  getAllServices(): Service[] {
    return this.getAllAplServices().map((service) => this.transformService(service) as Service)
  }

  getAllAplServices(): AplServiceResponse[] {
    return this.repoService.getAllServices()
  }

  getTeamServices(teamId: string): Service[] {
    return this.getTeamAplServices(teamId).map((service) => this.transformService(service) as Service)
  }

  getTeamAplServices(teamId: string): AplServiceResponse[] {
    return this.repoService.getTeamConfigService(teamId).getServices()
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
    try {
      const service = this.repoService.getTeamConfigService(teamId).createService(data)
      await this.saveTeamConfigItem(service)
      await this.doTeamDeployment(
        teamId,
        (teamService) => {
          teamService.createService(service)
        },
        false,
      )
      return service
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Service name already exists'
      throw err
    }
  }

  getService(teamId: string, name: string): Service {
    const service = this.getAplService(teamId, name)
    return this.transformService(service) as Service
  }

  getAplService(teamId: string, name: string): AplServiceResponse {
    return this.repoService.getTeamConfigService(teamId).getService(name)
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
    const service = patch
      ? this.repoService.getTeamConfigService(teamId).patchService(name, data)
      : this.repoService.getTeamConfigService(teamId).updateService(name, data as AplServiceRequest)
    await this.saveTeamConfigItem(service)
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.updateService(name, service)
      },
      false,
    )
    return service
  }

  async deleteService(teamId: string, name: string): Promise<void> {
    const service = this.getAplService(teamId, name)
    await this.deleteTeamConfigItem(service)
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.deleteService(name)
      },
      false,
    )
  }

  checkPublicUrlInUse(teamId: string, service: AplServiceRequest): void {
    // skip when editing or when svc is of type "cluster" as it has no url
    const newSvc = service.spec
    const services = this.repoService.getTeamConfigService(teamId).getServices()

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

  async doTeamDeployment(
    teamId: string,
    action: (teamService: TeamConfigService) => void,
    encryptSecrets = true,
    files?: string[],
  ): Promise<void> {
    const rootStack = await getSessionStack()

    try {
      // Commit and push Git changes
      await this.git.save(this.editor!, encryptSecrets, files)
      // Pull the latest changes to ensure we have the most recent state
      await rootStack.git.git.pull()

      // Update the team configuration of the root stack
      action(rootStack.repoService.getTeamConfigService(teamId))

      debug(`Updated root stack values with ${this.sessionId} changes`)
    } catch (e) {
      e.message = getSanitizedErrorMessage(e)
      throw e
    } finally {
      // Clean up the session
      await cleanSession(this.sessionId!)
    }
  }

  async doRepoDeployment(
    action: (repoService: RepoService) => void,
    encryptSecrets = true,
    files?: string[],
  ): Promise<void> {
    const rootStack = await getSessionStack()

    try {
      // Commit and push Git changes
      await this.git.save(this.editor!, encryptSecrets, files)
      // Pull the latest changes to ensure we have the most recent state
      await rootStack.git.git.pull()
      // update the repo configuration of the root stack
      action(rootStack.repoService)

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
    try {
      const sealedSecret = this.repoService.getTeamConfigService(teamId).createSealedSecret(data)
      await this.saveTeamSealedSecret(sealedSecret)
      await this.doTeamDeployment(
        teamId,
        (teamService) => {
          teamService.createSealedSecret(sealedSecret)
        },
        false,
      )
      return sealedSecret
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'SealedSecret name already exists'
      throw err
    }
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
    const existingSecret = this.repoService.getTeamConfigService(teamId).getSealedSecret(name)
    const namespace = data.spec?.namespace ?? existingSecret.spec.namespace ?? `team-${teamId}`
    const sealedSecret = patch
      ? this.repoService.getTeamConfigService(teamId).patchSealedSecret(name, {
          metadata: data.metadata,
          spec: {
            encryptedData: data.spec?.encryptedData,
            namespace,
          },
        })
      : this.repoService.getTeamConfigService(teamId).updateSealedSecret(name, {
          kind: 'AplTeamSecret',
          metadata: data.metadata,
          spec: {
            ...existingSecret.spec,
            encryptedData: data.spec?.encryptedData,
            namespace,
            immutable: data.spec?.immutable ?? existingSecret.spec.immutable,
            metadata: data.spec?.metadata ?? existingSecret.spec.metadata,
          },
        } as AplSecretRequest)
    await this.saveTeamSealedSecret(sealedSecret)
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.updateSealedSecret(name, sealedSecret)
      },
      false,
    )
    return sealedSecret
  }

  async deleteSealedSecret(teamId: string, name: string): Promise<void> {
    const sealedSecret = await this.getAplSealedSecret(teamId, name)
    this.repoService.getTeamConfigService(teamId).deleteSealedSecret(sealedSecret.metadata.name)
    const relativePath = getTeamSealedSecretsValuesFilePath(teamId, `${name}.yaml`)
    await this.git.removeFile(relativePath)
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.deleteSealedSecret(name)
      },
      false,
    )
  }

  async getSealedSecret(teamId: string, name: string): Promise<SealedSecret> {
    const aplSecret = await this.getAplSealedSecret(teamId, name)
    return getV1ObjectFromApl(aplSecret) as SealedSecret
  }

  async getAplSealedSecret(teamId: string, name: string): Promise<AplSecretResponse> {
    const sealedSecret = this.repoService.getTeamConfigService(teamId).getSealedSecret(name)
    return sealedSecret
  }

  getAllSealedSecrets(): SealedSecret[] {
    return this.getAllAplSealedSecrets().map(getV1ObjectFromApl) as SealedSecret[]
  }

  getAllAplSealedSecrets(): AplSecretResponse[] {
    return this.repoService.getAllSealedSecrets()
  }

  getSealedSecrets(teamId: string): SealedSecret[] {
    return this.getAplSealedSecrets(teamId).map(getV1ObjectFromApl) as SealedSecret[]
  }

  getAplSealedSecrets(teamId: string): AplSecretResponse[] {
    return this.repoService.getTeamConfigService(teamId).getSealedSecrets()
  }

  async getSecretsFromK8s(teamId: string): Promise<Array<string>> {
    if (env.isDev) return []
    return await getTeamSecretsFromK8s(`team-${teamId}`)
  }

  async createAplKnowledgeBase(teamId: string, data: AplKnowledgeBaseRequest): Promise<AplKnowledgeBaseResponse> {
    if (data.metadata.name.length < 2)
      throw new ValidationError('Knowledge base name must be at least 2 characters long')
    try {
      const knowledgeBase = this.repoService.getTeamConfigService(teamId).createKnowledgeBase(data)
      await this.saveTeamKnowledgeBase(teamId, knowledgeBase)
      await this.doTeamDeployment(
        teamId,
        (teamService) => {
          teamService.createKnowledgeBase(knowledgeBase)
        },
        false,
      )
      return knowledgeBase
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Knowledge base name already exists'
      throw err
    }
  }

  async editAplKnowledgeBase(
    teamId: string,
    name: string,
    data: DeepPartial<AplKnowledgeBaseRequest>,
    patch = false,
  ): Promise<AplKnowledgeBaseResponse> {
    const existingKB = this.repoService.getTeamConfigService(teamId).getKnowledgeBase(name)
    const knowledgeBase = patch
      ? this.repoService.getTeamConfigService(teamId).patchKnowledgeBase(name, {
          metadata: data.metadata,
          spec: data.spec,
        })
      : this.repoService.getTeamConfigService(teamId).updateKnowledgeBase(name, {
          kind: 'AkamaiKnowledgeBase',
          metadata: {
            name: data.metadata?.name ?? existingKB.metadata.name,
          },
          spec: {
            modelName: data.spec?.modelName ?? existingKB.spec.modelName,
            sourceUrl: data.spec?.sourceUrl ?? existingKB.spec.sourceUrl,
          },
        })

    await this.saveTeamKnowledgeBase(teamId, knowledgeBase)
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.updateKnowledgeBase(name, knowledgeBase)
      },
      false,
    )
    return knowledgeBase
  }

  async deleteAplKnowledgeBase(teamId: string, name: string): Promise<void> {
    const knowledgeBase = await this.getAplKnowledgeBase(teamId, name)
    this.repoService.getTeamConfigService(teamId).deleteKnowledgeBase(knowledgeBase.metadata.name)
    const relativePath = getTeamKnowledgeBaseValuesFilePath(teamId, `${name}.yaml`)
    const databasePath = getTeamDatabaseValuesFilePath(teamId, `${name}.yaml`)
    await this.git.removeFile(relativePath)
    await this.git.removeFile(databasePath)
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.deleteKnowledgeBase(name)
      },
      false,
    )
  }

  async getAplKnowledgeBase(teamId: string, name: string): Promise<AplKnowledgeBaseResponse> {
    const knowledgeBase = this.repoService.getTeamConfigService(teamId).getKnowledgeBase(name)
    return knowledgeBase
  }

  getAplKnowledgeBases(teamId: string): AplKnowledgeBaseResponse[] {
    return this.repoService.getTeamConfigService(teamId).getKnowledgeBases()
  }

  getAllAplKnowledgeBases(): AplKnowledgeBaseResponse[] {
    return this.repoService.getAllKnowledgeBases()
  }

  private async saveTeamKnowledgeBase(teamId: string, knowledgeBase: AplKnowledgeBaseResponse): Promise<void> {
    const databaseCR = await DatabaseCR.create(teamId, knowledgeBase.metadata.name)
    const knowledgeBaseCR = await AkamaiKnowledgeBaseCR.create(
      teamId,
      knowledgeBase.metadata.name,
      databaseCR.spec.cluster.name,
      {
        kind: 'AkamaiKnowledgeBase',
        metadata: knowledgeBase.metadata,
        spec: knowledgeBase.spec,
      },
    )

    await this.saveKnowledgeBaseCR(teamId, knowledgeBaseCR)
    await this.saveDatabaseCR(teamId, databaseCR)
  }

  // Agent methods - following the same patterns as knowledge base methods
  async createAplAgent(teamId: string, data: AplAgentRequest): Promise<AplAgentResponse> {
    if (data.metadata.name.length < 2) throw new ValidationError('Agent name must be at least 2 characters long')
    try {
      const agent = this.repoService.getTeamConfigService(teamId).createAgent(data)
      await this.saveTeamAgent(teamId, agent)
      await this.doTeamDeployment(
        teamId,
        (teamService) => {
          teamService.createAgent(agent)
        },
        false,
      )
      return agent
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Agent name already exists'
      throw err
    }
  }

  async editAplAgent(
    teamId: string,
    name: string,
    data: DeepPartial<AplAgentRequest>,
    patch = false,
  ): Promise<AplAgentResponse> {
    const existingAgent = this.repoService.getTeamConfigService(teamId).getAgent(name)
    const agent = patch
      ? this.repoService.getTeamConfigService(teamId).patchAgent(name, {
          metadata: data.metadata,
          spec: data.spec,
        })
      : this.repoService.getTeamConfigService(teamId).updateAgent(name, {
          kind: 'AkamaiAgent',
          metadata: {
            name: data.metadata?.name ?? existingAgent.metadata.name,
          },
          spec: {
            foundationModel: data.spec?.foundationModel ?? existingAgent.spec.foundationModel,
            agentInstructions: data.spec?.agentInstructions ?? existingAgent.spec.agentInstructions,
            tools: (data.spec?.tools ?? existingAgent.spec.tools) as typeof existingAgent.spec.tools,
          },
        })

    await this.saveTeamAgent(teamId, agent)
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.updateAgent(name, agent)
      },
      false,
    )
    return agent
  }

  async deleteAplAgent(teamId: string, name: string): Promise<void> {
    const agent = await this.getAplAgent(teamId, name)
    this.repoService.getTeamConfigService(teamId).deleteAgent(agent.metadata.name)
    const relativePath = getTeamAgentValuesFilePath(teamId, `${name}.yaml`)
    await this.git.removeFile(relativePath)
    await this.doTeamDeployment(
      teamId,
      (teamService) => {
        teamService.deleteAgent(name)
      },
      false,
    )
  }

  async getAplAgent(teamId: string, name: string): Promise<AplAgentResponse> {
    const agent = this.repoService.getTeamConfigService(teamId).getAgent(name)
    return agent
  }

  getAplAgents(teamId: string): AplAgentResponse[] {
    return this.repoService.getTeamConfigService(teamId).getAgents()
  }

  private async saveTeamAgent(teamId: string, agent: AplAgentResponse): Promise<void> {
    const agentCR = await AkamaiAgentCR.create(teamId, agent.metadata.name, {
      kind: 'AkamaiAgent',
      metadata: agent.metadata,
      spec: agent.spec,
    })

    await this.saveAgentCR(teamId, agentCR)
  }

  private async saveDatabaseCR(teamId: string, databaseCR: DatabaseCR) {
    const dbPath = getTeamDatabaseValuesFilePath(teamId, `${databaseCR.metadata.name}.yaml`)
    await this.git.writeFile(dbPath, databaseCR.toRecord())
  }

  private async saveKnowledgeBaseCR(teamId: string, knowledgeBaseCR: AkamaiKnowledgeBaseCR) {
    const kbPath = getTeamKnowledgeBaseValuesFilePath(teamId, `${knowledgeBaseCR.metadata.name}.yaml`)
    await this.git.writeFile(kbPath, knowledgeBaseCR.toRecord())
  }

  private async saveAgentCR(teamId: string, agentCR: AkamaiAgentCR) {
    const agentPath = getTeamAgentValuesFilePath(teamId, `${agentCR.metadata.name}.yaml`)
    await this.git.writeFile(agentPath, agentCR.toRecord())
  }

  async loadValues(): Promise<Promise<Promise<Promise<Promise<void>>>>> {
    debug('Loading values')
    await this.git.initSops()
    await this.initRepo()
    this.isLoaded = true
  }

  async saveAdminApp(app: App, secretPaths?: string[]): Promise<void> {
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
    this.repoService.deleteUser(user.email)
    const users: User[] = []
    users.push(user)
    const fileMap = getFileMaps('').find((fm) => fm.kind === 'AplUser')!
    await this.git.deleteConfig({ users }, fileMap, 'secrets.')
  }

  async saveTeam(team: AplTeamSettingsResponse, secretPaths?: string[]): Promise<void> {
    const { kind, metadata } = team
    debug(`Saving team ${metadata.name}`)
    const repo = this.createTeamConfigInRepo(team.metadata.name, 'settings', team)
    const fileMap = getFileMaps('').find((fm) => fm.kind === kind)!
    await this.git.saveConfigWithSecrets(repo, secretPaths ?? this.getSecretPaths(), fileMap)
  }

  async deleteTeamConfig(name: string): Promise<void> {
    this.repoService.deleteTeamConfig(name)
    const teamDir = `env/teams/${name}`
    await this.git.removeDir(teamDir)
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

  private createTeamConfigInRepo<T>(teamId: string, key: string, value: T): Record<string, any> {
    return {
      teamConfig: {
        [teamId]: {
          [key]: value,
        },
      },
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
