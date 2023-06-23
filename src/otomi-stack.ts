/* eslint-disable class-methods-use-this */
import * as k8s from '@kubernetes/client-node'
import { V1ObjectReference } from '@kubernetes/client-node'
import Debug from 'debug'

import { emptyDir, pathExists, unlink } from 'fs-extra'
import { readFile, readdir, writeFile } from 'fs/promises'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { cloneDeep, each, filter, get, isArray, isEmpty, omit, pick, set } from 'lodash'
import generatePassword from 'password-generator'
import * as osPath from 'path'
import { getAppList, getAppSchema, getSpec } from 'src/app'
import Db from 'src/db'
import { AlreadyExists, DeployLockError, PublicUrlExists, ValidationError } from 'src/error'
import { DbMessage, cleanAllSessions, cleanSession, getIo, getSessionStack } from 'src/middleware'
import {
  App,
  Backup,
  Build,
  Cloudtty,
  Core,
  K8sService,
  License,
  Metrics,
  Policies,
  Project,
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
import { arrayToObject, getServiceUrl, objectToArray, removeBlankAttributes } from 'src/utils'
import {
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
  cleanEnv,
} from 'src/validators'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { apply, watchPodUntilRunning } from './apply'
import { k8sdelete } from './k8sdelete'
import connect from './otomiCloud/connect'

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

export function getTeamBackupsFilePath(teamId: string): string {
  return `env/teams/backups.${teamId}.yaml`
}
export function getTeamBackupsJsonPath(teamId: string): string {
  return `teamConfig.${teamId}.backups`
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

export function getTeamProjectsFilePath(teamId: string): string {
  return `env/teams/projects.${teamId}.yaml`
}

export function getTeamBuildsFilePath(teamId: string): string {
  return `env/teams/builds.${teamId}.yaml`
}

export function getTeamWorkloadsJsonPath(teamId: string): string {
  return `teamConfig.${teamId}.workloads`
}

export function getTeamProjectsJsonPath(teamId: string): string {
  return `teamConfig.${teamId}.projects`
}

export function getTeamBuildsJsonPath(teamId: string): string {
  return `teamConfig.${teamId}.builds`
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

  getMetrics(): Metrics {
    const metrics: Metrics = {
      otomi_backups: this.getAllBackups().length,
      otomi_builds: this.getAllBuilds().length,
      otomi_secrets: this.getAllSecrets().length,
      otomi_services: this.getAllServices().length,
      // We do not count team_admin as a regular team
      otomi_teams: this.getTeams().length - 1,
      otomi_workloads: this.getAllWorkloads().length,
    }
    return metrics
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

  getLicense(): License {
    const license = this.db.db.get(['license']).value() as License
    return license
  }

  async validateLicense(jwtLicense: string): Promise<License> {
    const licensePath = osPath.resolve(__dirname, 'license/license.pem')
    const publicKey = await readFile(licensePath, 'utf8')
    return this.verifyLicense(jwtLicense, publicKey)
  }

  verifyLicense(jwtLicense: string, rsaPublicKey: string): License {
    const license: License = { isValid: false, hasLicense: true, body: undefined, jwt: jwtLicense }
    try {
      const jwtPayload = jwt.verify(jwtLicense, rsaPublicKey) as JwtPayload
      license.body = jwtPayload.body
      license.isValid = true
    } catch (err) {
      return license
    }
    return license
  }

  // TODO: Delete - Debug purposes only
  async removeLicense() {
    if (await this.repo.fileExists('env/secrets.license.yaml')) {
      await this.repo.removeFile('env/secrets.license.yaml').then(() => {
        const license: License = { isValid: false, hasLicense: false, body: undefined }
        this.db.db.set('license', license).write()
        this.doDeployment()
      })
    }
  }

  async uploadLicense(jwtLicense: string): Promise<License> {
    debug('Uploading the license')

    const license = await this.validateLicense(jwtLicense)
    if (!license.isValid) {
      debug('License invalid')
      return license
    }

    this.db.db.set('license', license).write()
    const clusterInfo = this.getSettings(['cluster'])
    const apiKey = license.body?.key as string
    await connect(apiKey, clusterInfo)
    this.doDeployment()
    debug('License uploaded')
    return license
  }

  async loadLicense(): Promise<void> {
    debug('Loading license')
    if (!(await this.repo.fileExists('env/secrets.license.yaml'))) {
      debug('License file does not exists')
      const license: License = { isValid: false, hasLicense: false, body: undefined }
      this.db.db.set('license', license).write()
      return
    }

    const licenseValues = await this.repo.readFile('env/secrets.license.yaml', true)
    const jwtLicense: string = licenseValues.license
    const license = await this.validateLicense(jwtLicense)

    if (!license.isValid) {
      debug('License file invalid')
      return
    }
    this.db.db.set('license', license).write()
    debug('Loaded license')
  }

  async saveLicense(secretPaths?: string[]): Promise<void> {
    const license = this.db.db.get(['license']).value() as License
    if (!license.hasLicense) return
    await this.repo.saveConfig(
      'env/license.yaml',
      'env/secrets.license.yaml',
      { license: license.jwt },
      secretPaths ?? this.getSecretPaths(),
    )
  }

  getSettings(keys?: string[]): Settings {
    const settings = this.db.db.get(['settings']).value()
    if (!keys) return settings
    return pick(settings, keys) as Settings
  }

  editSettings(data: Settings, settingId: string) {
    const settings = this.db.db.get('settings').value()
    // do not merge as oneOf properties cannot be merged
    // for the policies we do want to merge
    if (data.policies) {
      Object.assign(settings.policies, data.policies)
      Object.assign(data[settingId], settings.policies)
    }
    settings[settingId] = removeBlankAttributes(data[settingId] as Record<string, any>)
    this.db.db.set('settings', settings).write()
    return settings
  }

  // Check if the collection name already exists in any collection
  isCollectionNameTaken(collectionName: string, teamId: string, name: string): boolean {
    return this.db.getCollection(collectionName).some((e: any) => {
      return e.teamId === teamId && e.name === name
    })
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

  getTeamBackups(teamId: string): Array<Backup> {
    const ids = { teamId }
    return this.db.getCollection('backups', ids) as Array<Backup>
  }

  getAllBackups(): Array<Backup> {
    return this.db.getCollection('backups') as Array<Backup>
  }

  createBackup(teamId: string, data: Backup): Backup {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return this.db.createItem('backups', { ...data, teamId }, { teamId, name: data.name }) as Backup
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Backup name already exists'
      throw err
    }
  }
  getBackup(id: string): Backup {
    return this.db.getItem('backups', { id }) as Backup
  }

  editBackup(id: string, data: Backup): Backup {
    return this.db.updateItem('backups', data, { id }) as Backup
  }

  deleteBackup(id: string): void {
    return this.db.deleteItem('backups', { id })
  }

  getTeamProjects(teamId: string): Array<Project> {
    const ids = { teamId }
    return this.db.getCollection('projects', ids) as Array<Project>
  }

  getAllProjects(): Array<Project> {
    return this.db.getCollection('projects') as Array<Project>
  }

  // Creates a new project and reserves a given name for 'builds', 'workloads' and 'services' resources
  createProject(teamId: string, data: Project): Project {
    // Check if the project name already exists in any collection
    const projectNameTaken = ['builds', 'workloads', 'services'].some((collectionName) =>
      this.isCollectionNameTaken(collectionName, teamId, data.name),
    )
    const projectNameTakenPublicMessage = `In the team '${teamId}' there is already a resource that match the project name '${data.name}'`

    try {
      if (projectNameTaken) throw new AlreadyExists(projectNameTakenPublicMessage)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return this.db.createItem('projects', { ...data, teamId }, { teamId, name: data.name }) as Project
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

  editProject(id: string, data: Project): Project {
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
    return this.db.updateItem('projects', updatedData, { id }) as Project
  }

  // Deletes a project and all its related resources
  deleteProject(id: string): void {
    const p = this.db.getItem('projects', { id }) as Project
    if (p.build?.id) this.db.deleteItem('builds', { id: p.build.id })
    if (p.workload?.id) this.db.deleteItem('workloads', { id: p.workload.id })
    if (p.workloadValues?.id) this.db.deleteItem('workloadValues', { id: p.workloadValues.id })
    if (p.service?.id) this.db.deleteItem('services', { id: p.service.id })
    return this.db.deleteItem('projects', { id })
  }

  getTeamBuilds(teamId: string): Array<Build> {
    const ids = { teamId }
    return this.db.getCollection('builds', ids) as Array<Build>
  }

  getAllBuilds(): Array<Build> {
    return this.db.getCollection('builds') as Array<Build>
  }

  createBuild(teamId: string, data: Build): Build {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return this.db.createItem('builds', { ...data, teamId }, { teamId, name: data.name }) as Build
    } catch (err) {
      if (err.code === 409) err.publicMessage = 'Build name already exists'
      throw err
    }
  }

  getBuild(id: string): Build {
    return this.db.getItem('builds', { id }) as Build
  }

  editBuild(id: string, data: Build): Build {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.db.updateItem('builds', data, { id }) as Build
  }

  deleteBuild(id: string): void {
    const p = this.db.getCollection('projects') as Array<Project>
    p.forEach((project: Project) => {
      if (project?.build?.id === id) {
        const updatedData = { ...project, build: null }
        this.db.updateItem('projects', updatedData, { id: project.id }) as Project
      }
    })
    return this.db.deleteItem('builds', { id })
  }

  async connectCloudtty(data: Cloudtty): Promise<Cloudtty | any> {
    const variables = {
      FQDN: data.domain,
      EMAIL: data.emailNoSymbols,
    }
    const { userTeams } = data
    const cloudttys = this.db.getCollection('cloudttys') as Array<Cloudtty>
    const cloudtty = cloudttys.find((c) => c.emailNoSymbols === data.emailNoSymbols)

    if (cloudtty) return cloudtty

    if (await pathExists('/tmp/ttyd.yaml')) await unlink('/tmp/ttyd.yaml')

    //if user is admin then read the manifests from ./dist/src/ttyManifests/adminTtyManifests
    const files = data.isAdmin
      ? await readdir('./dist/src/ttyManifests/adminTtyManifests', 'utf-8')
      : await readdir('./dist/src/ttyManifests', 'utf-8')
    const filteredFiles = files.filter((file) => file.startsWith('tty'))
    const variableKeys = Object.keys(variables)

    const podContentForAdmin = (fileContent) => {
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
        if (data.isAdmin && file === 'tty_02_Pod.yaml') fileContent = podContentForAdmin(fileContent)
        if (!data.isAdmin && file === 'tty_03_Rolebinding.yaml') fileContent = rolebindingContentsForUsers(fileContent)
        return fileContent
      }),
    )
    await writeFile('/tmp/ttyd.yaml', fileContents, 'utf-8')
    await apply('/tmp/ttyd.yaml')
    await watchPodUntilRunning('team-admin', `tty-${data.emailNoSymbols}`)

    return this.db.createItem(
      'cloudttys',
      { ...data, iFrameUrl: `https://tty.${data.domain}/${data.emailNoSymbols}` },
      { teamId: data.teamId, name: `tty-${data.emailNoSymbols}` },
    ) as Cloudtty
  }

  async deleteCloudtty(data: Cloudtty) {
    const cloudttys = this.db.getCollection('cloudttys') as Array<Cloudtty>
    const cloudtty = cloudttys.find((c) => c.emailNoSymbols === data.emailNoSymbols) as Cloudtty
    await k8sdelete(data)
    return this.db.deleteItem('cloudttys', { id: cloudtty.id })
  }

  async saveCloudttys(): Promise<void> {
    const cloudttys = this.db.getCollection('cloudttys') as Array<Cloudtty>
    const outData: Record<string, any> = set({}, 'env/cloudttys.yaml', cloudttys)
    debug(`Saving cloudttys`)
    await this.repo.writeFile('env/cloudttys.yaml', outData)
  }

  async loadCloudttys(): Promise<void> {
    debug('Loading cloudttys')
    if (!(await this.repo.fileExists('env/cloudttys.yaml'))) {
      debug('Cloudttys file does not exists')
      return
    }

    const data = await this.repo.readFile('env/cloudttys.yaml', true)
    const inData: Array<Cloudtty> = get(data, 'env/cloudttys.yaml', [])
    inData.forEach((inCloudtty) => {
      const res: any = this.db.populateItem('cloudttys', inCloudtty, undefined, inCloudtty.id as string)
      debug(`Loaded cloudtty: name: ${res.name}, id: ${res.id}`)
    })
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
    const p = this.db.getCollection('projects') as Array<Project>
    p.forEach((project: Project) => {
      if (project?.workload?.id === id) {
        const updatedData = { ...project, workload: null, workloadValues: null }
        this.db.updateItem('projects', updatedData, { id: project.id }) as Project
      }
    })
    this.db.deleteItem('workloadValues', { id })
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
    this.deleteService(id, false)
    return this.createService(data.teamId!, { ...data, id })
  }

  deleteService(id: string, deleteProjectService = true): void {
    if (deleteProjectService) {
      const p = this.db.getCollection('projects') as Array<Project>
      p.forEach((project: Project) => {
        if (project?.service?.id === id) {
          const updatedData = { ...project, service: null }
          this.db.updateItem('projects', updatedData, { id: project.id }) as Project
        }
      })
    }
    return this.db.deleteItem('services', { id })
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

  async loadValues(): Promise<Promise<Promise<Promise<Promise<void>>>>> {
    debug('Loading values')
    await this.loadLicense()
    await this.loadCluster()
    await this.loadPolicies()
    await this.loadSettings()
    await this.loadTeams()
    await this.loadCloudttys()
    await this.loadApps()
    // load license
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
      this.loadTeamServices(team.id!)
      this.loadTeamSecrets(team.id!)
      this.loadTeamWorkloads(team.id!)
      this.loadTeamBackups(team.id!)
      this.loadTeamProjects(team.id!)
      this.loadTeamBuilds(team.id!)
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
        await this.saveTeamBackups(teamId)
        await this.saveTeamServices(teamId)
        await this.saveTeamSecrets(teamId)
        await this.saveTeamWorkloads(teamId)
        await this.saveTeamProjects(teamId)
        await this.saveTeamBuilds(teamId)
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
      'paths',
      'type',
      'ownHost',
      'tlsPass',
      'ingressClassName',
      'headers',
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
        useDefaultSubdomain: !svcRaw.domain && svcRaw.ownHost,
        ingressClassName: svcRaw.ingressClassName || undefined,
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
    await this.saveLicense(secretPaths)
    await this.saveCloudttys()
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
      license: rootStack.getLicense(),
    }
    return data
  }
}
