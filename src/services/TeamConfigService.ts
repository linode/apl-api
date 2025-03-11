import { find, has, merge, omit, pick, remove, set } from 'lodash'
import { v4 as uuidv4 } from 'uuid'
import { AlreadyExists, NotExistError } from '../error'
import {
  AplBackupRequest,
  AplBackupResponse,
  AplBuildRequest,
  AplBuildResponse,
  AplCodeRepoRequest,
  AplCodeRepoResponse,
  AplNetpolRequest,
  AplNetpolResponse,
  AplProjectRequest,
  AplProjectResponse,
  AplRequestObject,
  AplResourceKind,
  AplResponseObject,
  AplSecretRequest,
  AplSecretResponse,
  AplServiceRequest,
  AplServiceResponse,
  AplWorkloadRequest,
  AplWorkloadResponse,
  App,
  Backup,
  Build,
  CodeRepo,
  Netpol,
  Policies,
  Policy,
  Project,
  ResourceTeamMetadata,
  SealedSecret,
  Service,
  Team,
  TeamConfig,
  V1ApiObject,
  Workload,
  WorkloadValues,
} from '../otomi-models'
import { objectToYaml } from '../utils'
import { parse } from 'yaml'

export class TeamConfigService {
  constructor(private teamConfig: TeamConfig) {
    this.teamConfig.builds ??= []
    this.teamConfig.workloads ??= []
    this.teamConfig.services ??= []
    this.teamConfig.sealedsecrets ??= []
    this.teamConfig.backups ??= []
    this.teamConfig.projects ??= []
    this.teamConfig.netpols ??= []
    this.teamConfig.apps ??= []
    this.teamConfig.policies ??= {}
  }

  private createMetadata(name: string, id?: string): ResourceTeamMetadata {
    return {
      name,
      labels: {
        'apl.io/id': id ?? uuidv4(),
        'apl.io/teamId': this.teamConfig.settings?.id,
      },
    }
  }

  private createAplObject(name: string, request: AplRequestObject): AplResponseObject {
    return {
      kind: request.kind,
      metadata: this.createMetadata(name),
      spec: request.spec,
      status: {},
    } as AplResponseObject
  }

  private getAplObject(kind: AplResourceKind, spec: V1ApiObject): AplRequestObject {
    return {
      kind,
      metadata: {
        name: spec.name,
      },
      spec: omit(spec, ['id', 'teamId', 'name']),
    } as AplRequestObject
  }

  private getV1Object(aplObject: AplResponseObject): V1ApiObject {
    return {
      id: aplObject.metadata.labels['apl.io/id'],
      teamId: aplObject.metadata.labels['apl.io/teamId'],
      name: aplObject.metadata.name,
      ...aplObject.spec,
    }
  }

  private getAplMergeObject(updates: Partial<AplRequestObject>): Partial<AplRequestObject> {
    return {
      metadata: updates.metadata?.name
        ? {
            name: updates.metadata?.name,
          }
        : undefined,
      spec: updates.spec,
    } as Partial<AplRequestObject>
  }

  private getV1MergeObject(updates: Partial<V1ApiObject>): Partial<AplRequestObject> {
    return {
      metadata: updates.name
        ? {
            name: updates.name,
          }
        : undefined,
      spec: omit(updates, ['id', 'teamId', 'name']),
    }
  }

  // =====================================
  // == BUILDS CRUD ==
  // =====================================

  public createBuild(build: Build): Build {
    const newBuild = this.createAplBuild(this.getAplObject('AplTeamBuild', build) as AplBuildRequest)
    return this.getV1Object(newBuild) as Build
  }

  public createAplBuild(build: AplBuildRequest): AplBuildResponse {
    const { name } = build.metadata
    if (find(this.teamConfig.builds, (item) => item.metadata.name === name)) {
      throw new AlreadyExists(`Build[${name}] already exists.`)
    }

    const newBuild = this.createAplObject(name, build) as AplBuildResponse
    this.teamConfig.builds.push(newBuild)
    return newBuild
  }

  public getBuild(name: string): Build {
    const build = this.getAplBuild(name)
    return this.getV1Object(build) as Build
  }

  public getAplBuild(name: string): AplBuildResponse {
    const build = find(this.teamConfig.builds, (item) => item.metadata.name === name)
    if (!build) {
      throw new NotExistError(`Build[${name}] does not exist.`)
    }
    return build
  }

  public getBuilds(): Build[] {
    return this.getAplBuilds().map((build) => this.getV1Object(build) as Build)
  }

  public getAplBuilds(): AplBuildResponse[] {
    return this.teamConfig.builds ?? []
  }

  public updateBuild(name: string, updates: Partial<Build>): Build {
    const mergeObj = this.getV1MergeObject(updates) as Partial<AplBuildRequest>
    const mergedBuild = this.updateAplBuild(name, mergeObj)
    return this.getV1Object(mergedBuild) as Build
  }

  public updateAplBuild(name: string, updates: Partial<AplBuildRequest>): AplBuildResponse {
    const build = this.getAplBuild(name)
    const mergeObj = this.getAplMergeObject(updates)
    return merge(build, mergeObj)
  }

  public deleteBuild(name: string): void {
    remove(this.teamConfig.builds, (item) => item.metadata.name === name)
  }

  // =====================================
  // == CODEREPOS CRUD ==
  // =====================================

  public createCodeRepo(codeRepo: CodeRepo): CodeRepo {
    const newCodeRepo = this.createAplCodeRepo(this.getAplObject('AplTeamCodeRepo', codeRepo) as AplCodeRepoRequest)
    return this.getV1Object(newCodeRepo) as CodeRepo
  }

  public createAplCodeRepo(codeRepo: AplCodeRepoRequest): AplCodeRepoResponse {
    const { name } = codeRepo.metadata
    if (find(this.teamConfig.codeRepos, (item) => item.metadata.name === name)) {
      throw new AlreadyExists(`CodeRepo[${name}] already exists.`)
    }

    const newCodeRepo = this.createAplObject(name, codeRepo) as AplCodeRepoResponse
    this.teamConfig.codeRepos.push(newCodeRepo)
    return newCodeRepo
  }

  public getCodeRepo(name: string): CodeRepo {
    const codeRepo = this.getAplCodeRepo(name)
    return this.getV1Object(codeRepo) as CodeRepo
  }

  public getAplCodeRepo(name: string): AplCodeRepoResponse {
    const codeRepo = find(this.teamConfig.codeRepos, (item) => item.metadata.name === name)
    if (!codeRepo) {
      throw new NotExistError(`CodeRepo[${name}] does not exist.`)
    }
    return codeRepo
  }

  public getCodeRepos(): CodeRepo[] {
    return this.getAplCodeRepos().map((codeRepo) => this.getV1Object(codeRepo) as CodeRepo)
  }

  public getAplCodeRepos(): AplCodeRepoResponse[] {
    return this.teamConfig.codeRepos ?? []
  }

  public updateCodeRepo(name: string, updates: Partial<CodeRepo>): CodeRepo {
    const mergeObj = this.getV1MergeObject(updates) as Partial<AplCodeRepoRequest>
    const mergedCodeRepo = this.updateAplCodeRepo(name, mergeObj)
    return this.getV1Object(mergedCodeRepo) as CodeRepo
  }

  public updateAplCodeRepo(name: string, updates: Partial<AplCodeRepoRequest>): AplCodeRepoResponse {
    const codeRepo = this.getAplCodeRepo(name)
    const mergeObj = this.getAplMergeObject(updates)
    return merge(codeRepo, mergeObj)
  }

  public deleteCodeRepo(name: string): void {
    remove(this.teamConfig.codeRepos, (item) => item.metadata.name === name)
  }

  // =====================================
  // == WORKLOADS CRUD ==
  // =====================================

  public createWorkload(workload: Workload): Workload {
    const newWorkload = this.createAplWorkload(this.getAplObject('AplTeamWorkload', workload) as AplWorkloadRequest)
    return omit(this.getV1Object(newWorkload), ['values']) as Workload
  }

  public createAplWorkload(workload: AplWorkloadRequest): AplWorkloadResponse {
    const { name } = workload.metadata
    if (find(this.teamConfig.workloads, (item) => item.metadata.name === name)) {
      throw new AlreadyExists(`Workload[${name}] already exists.`)
    }

    const newWorkload = this.createAplObject(name, workload) as AplWorkloadResponse
    this.teamConfig.workloads.push(newWorkload)
    return newWorkload
  }

  public getWorkload(name: string): Workload {
    const workload = this.getAplWorkload(name)
    return omit(this.getV1Object(workload), ['values']) as Workload
  }

  public getAplWorkload(name: string): AplWorkloadResponse {
    const workload = find(this.teamConfig.workloads, (item) => item.metadata.name === name)
    if (!workload) {
      throw new NotExistError(`Workload[${name}] does not exist.`)
    }
    return workload
  }

  public getWorkloads(): Workload[] {
    return this.getAplWorkloads().map((workload) => omit(this.getV1Object(workload), ['values']) as Workload)
  }

  public getAplWorkloads(): AplWorkloadResponse[] {
    return this.teamConfig.workloads ?? []
  }

  public updateWorkload(name: string, updates: Partial<Workload>): Workload {
    const mergeObj = this.getV1MergeObject(updates) as Partial<AplWorkloadRequest>
    const mergedWorkload = this.updateAplWorkload(name, mergeObj)
    return omit(this.getV1Object(mergedWorkload), ['values']) as Workload
  }

  public updateAplWorkload(name: string, updates: Partial<AplWorkloadRequest>): AplWorkloadResponse {
    const workload = this.getAplWorkload(name)
    const mergeObj = this.getAplMergeObject(updates)
    return merge(workload, mergeObj)
  }

  public deleteWorkload(name: string): void {
    remove(this.teamConfig.workloads, (item) => item.metadata.name === name)
  }

  // =====================================
  // == WORKLOADVALUES CRUD ==
  // =====================================

  public createWorkloadValues(workloadValues: WorkloadValues): WorkloadValues {
    const workload = this.getAplWorkload(workloadValues.name!)
    if (workload.spec.values) {
      throw new AlreadyExists(`Workload[${workloadValues.name}] already exists.`)
    }
    return this.updateWorkloadValues(workloadValues.name!, workloadValues)
  }

  public getWorkloadValues(name: string): WorkloadValues {
    const workload = this.getAplWorkload(name)
    return merge(pick(this.getV1Object(workload), ['id', 'teamId', 'name']), {
      values: parse(workload.spec.values) || {},
    }) as WorkloadValues
  }

  public updateWorkloadValues(name: string, updates: Partial<WorkloadValues>): WorkloadValues {
    const workload = this.getAplWorkload(name)
    workload.spec.values = objectToYaml(updates.values || {})
    return merge(pick(this.getV1Object(workload), ['id', 'teamId', 'name']), {
      values: updates.values || {},
    }) as WorkloadValues
  }

  public deleteWorkloadValues(name: string): void {
    const workload = this.getAplWorkload(name)
    workload.spec.values = ''
  }

  // =====================================
  // == SERVICES CRUD ==
  // =====================================

  public createService(service: Service): Service {
    const newService = this.createAplService(this.getAplObject('AplTeamService', service) as AplServiceRequest)
    return this.getV1Object(newService) as Service
  }

  public createAplService(service: AplServiceRequest): AplServiceResponse {
    const { name } = service.metadata
    if (find(this.teamConfig.services, (item) => item.metadata.name === name)) {
      throw new AlreadyExists(`Service[${name}] already exists.`)
    }

    const newService = this.createAplObject(name, service) as AplServiceResponse
    this.teamConfig.services.push(newService)
    return newService
  }

  public getService(name: string): Service {
    const service = this.getAplService(name)
    return this.getV1Object(service) as Service
  }

  public getAplService(name: string): AplServiceResponse {
    const service = find(this.teamConfig.services, (item) => item.metadata.name === name)
    if (!service) {
      throw new NotExistError(`Service[${name}] does not exist.`)
    }
    return service
  }

  public getServices(): Service[] {
    return this.getAplServices().map((service) => this.getV1Object(service) as Service)
  }

  public getAplServices(): AplServiceResponse[] {
    return this.teamConfig.services ?? []
  }

  public updateService(name: string, updates: Partial<Service>): Service {
    const mergeObj = this.getV1MergeObject(updates) as Partial<AplServiceRequest>
    const mergedService = this.updateAplService(name, mergeObj)
    return this.getV1Object(mergedService) as Service
  }

  public updateAplService(name: string, updates: Partial<AplServiceRequest>): AplServiceResponse {
    const service = this.getAplService(name)
    const mergeObj = this.getAplMergeObject(updates)
    return merge(service, mergeObj)
  }

  public deleteService(name: string): void {
    remove(this.teamConfig.services, (item) => item.metadata.name === name)
  }

  // =====================================
  // == SEALED SECRETS CRUD ==
  // =====================================

  public createSealedSecret(secret: SealedSecret): SealedSecret {
    const newSecret = this.createAplSecret(this.getAplObject('AplTeamSecret', secret) as AplSecretRequest)
    return this.getV1Object(newSecret) as SealedSecret
  }

  public createAplSecret(secret: AplSecretRequest): AplSecretResponse {
    const { name } = secret.metadata
    if (find(this.teamConfig.sealedsecrets, (item) => item.metadata.name === name)) {
      throw new AlreadyExists(`SealedSecret[${name}] already exists.`)
    }

    const newSecret = this.createAplObject(name, secret) as AplSecretResponse
    this.teamConfig.sealedsecrets.push(newSecret)
    return newSecret
  }

  public getSealedSecret(name: string): SealedSecret {
    const secret = this.getAplSecret(name)
    return this.getV1Object(secret) as SealedSecret
  }

  public getAplSecret(name: string): AplSecretResponse {
    const secret = find(this.teamConfig.sealedsecrets, (item) => item.metadata.name === name)
    if (!secret) {
      throw new NotExistError(`SealedSecret[${name}] does not exist.`)
    }
    return secret
  }

  public getSealedSecrets(): SealedSecret[] {
    return this.getAplSecrets().map((secret) => this.getV1Object(secret) as SealedSecret)
  }

  public getAplSecrets(): AplSecretResponse[] {
    return this.teamConfig.sealedsecrets ?? []
  }

  public updateSealedSecret(name: string, updates: Partial<SealedSecret>): SealedSecret {
    const mergeObj = this.getV1MergeObject(updates) as Partial<AplSecretRequest>
    const mergedSecret = this.updateAplSecret(name, mergeObj)
    return this.getV1Object(mergedSecret) as SealedSecret
  }

  public updateAplSecret(name: string, updates: Partial<AplSecretRequest>): AplSecretResponse {
    const secret = this.getAplSecret(name)
    const mergeObj = this.getAplMergeObject(updates)
    return merge(secret, mergeObj)
  }

  public deleteSealedSecret(name: string): void {
    remove(this.teamConfig.sealedsecrets, (item) => item.metadata.name === name)
  }

  // =====================================
  // == BACKUPS CRUD ==
  // =====================================

  public createBackup(backup: Backup): Backup {
    const newBackup = this.createAplBackup(this.getAplObject('AplTeamBackup', backup) as AplBackupRequest)
    return this.getV1Object(newBackup) as Backup
  }

  public createAplBackup(backup: AplBackupRequest): AplBackupResponse {
    const { name } = backup.metadata
    if (find(this.teamConfig.backups, (item) => item.metadata.name === name)) {
      throw new AlreadyExists(`Backup[${name}] already exists.`)
    }

    const newBackup = this.createAplObject(name, backup) as AplBackupResponse
    this.teamConfig.backups.push(newBackup)
    return newBackup
  }

  public getBackup(name: string): Backup {
    const backup = this.getAplBackup(name)
    return this.getV1Object(backup) as Backup
  }

  public getAplBackup(name: string): AplBackupResponse {
    const backup = find(this.teamConfig.backups, (item) => item.metadata.name === name)
    if (!backup) {
      throw new NotExistError(`Backup[${name}] does not exist.`)
    }
    return backup
  }

  public getBackups(): Backup[] {
    return this.getAplBackups().map((backup) => this.getV1Object(backup) as Backup)
  }

  public getAplBackups(): AplBackupResponse[] {
    return this.teamConfig.backups ?? []
  }

  public updateBackup(name: string, updates: Partial<Backup>): Backup {
    const mergeObj = this.getV1MergeObject(updates) as Partial<AplBackupRequest>
    const mergedBackup = this.updateAplBackup(name, mergeObj)
    return this.getV1Object(mergedBackup) as Backup
  }

  public updateAplBackup(name: string, updates: Partial<AplBackupRequest>): AplBackupResponse {
    const backup = this.getAplBackup(name)
    const mergeObj = this.getAplMergeObject(updates)
    return merge(backup, mergeObj)
  }

  public deleteBackup(name: string): void {
    remove(this.teamConfig.backups, (item) => item.metadata.name === name)
  }

  // =====================================
  // == PROJECTS CRUD ==
  // =====================================

  public createProject(project: Project): Project {
    const newProject = this.createAplProject(this.getAplObject('AplTeamProject', project) as AplProjectRequest)
    return this.getV1Object(newProject) as Project
  }

  public createAplProject(project: AplProjectRequest): AplProjectResponse {
    const { name } = project.metadata
    if (find(this.teamConfig.projects, (item) => item.metadata.name === name)) {
      throw new AlreadyExists(`Project[${name}] already exists.`)
    }

    const newProject = this.createAplObject(name, project) as AplProjectResponse
    this.teamConfig.projects.push(newProject)
    return newProject
  }

  public getProject(name: string): Project {
    const project = this.getAplProject(name)
    return this.getV1Object(project) as Project
  }

  public getAplProject(name: string): AplProjectResponse {
    const project = find(this.teamConfig.projects, (item) => item.metadata.name === name)
    if (!project) {
      throw new NotExistError(`Project[${name}] does not exist.`)
    }
    return project
  }

  public getProjects(): Project[] {
    return this.getAplProjects().map((project) => this.getV1Object(project) as Project)
  }

  public getAplProjects(): AplProjectResponse[] {
    return this.teamConfig.projects ?? []
  }

  public updateProject(name: string, updates: Partial<Project>): Project {
    const mergeObj = this.getV1MergeObject(updates) as Partial<AplProjectRequest>
    const mergedProject = this.updateAplProject(name, mergeObj)
    return this.getV1Object(mergedProject) as Project
  }

  public updateAplProject(name: string, updates: Partial<AplProjectRequest>): AplProjectResponse {
    const project = this.getAplProject(name)
    const mergeObj = this.getAplMergeObject(updates)
    return merge(project, mergeObj)
  }

  public deleteProject(name: string): void {
    remove(this.teamConfig.projects, (item) => item.metadata.name === name)
  }

  // =====================================
  // == NETPOLS CRUD ==
  // =====================================

  public createNetpol(netpol: Netpol): Netpol {
    const newNetpol = this.createAplNetpol(this.getAplObject('AplTeamNetpol', netpol) as AplNetpolRequest)
    return this.getV1Object(newNetpol) as Netpol
  }

  public createAplNetpol(netpol: AplNetpolRequest): AplNetpolResponse {
    const { name } = netpol.metadata
    if (find(this.teamConfig.netpols, (item) => item.metadata.name === name)) {
      throw new AlreadyExists(`Netpol[${name}] already exists.`)
    }

    const newNetpol = this.createAplObject(name, netpol) as AplNetpolResponse
    this.teamConfig.netpols.push(newNetpol)
    return newNetpol
  }

  public getNetpol(name: string): Netpol {
    const netpol = this.getAplNetpol(name)
    return this.getV1Object(netpol) as Netpol
  }

  public getAplNetpol(name: string): AplNetpolResponse {
    const netpol = find(this.teamConfig.netpols, (item) => item.metadata.name === name)
    if (!netpol) {
      throw new NotExistError(`Netpol[${name}] does not exist.`)
    }
    return netpol
  }

  public getNetpols(): Netpol[] {
    return this.getAplNetpols().map((netpol) => this.getV1Object(netpol) as Netpol)
  }

  public getAplNetpols(): AplNetpolResponse[] {
    return this.teamConfig.netpols ?? []
  }

  public updateNetpol(name: string, updates: Partial<Netpol>): Netpol {
    const mergeObj = this.getV1MergeObject(updates) as Partial<AplNetpolRequest>
    const mergedNetpol = this.updateAplNetpol(name, mergeObj)
    return this.getV1Object(mergedNetpol) as Netpol
  }

  public updateAplNetpol(name: string, updates: Partial<AplNetpolRequest>): AplNetpolResponse {
    const netpol = this.getAplNetpol(name)
    const mergeObj = this.getAplMergeObject(updates)
    return merge(netpol, mergeObj)
  }

  public deleteNetpol(name: string): void {
    remove(this.teamConfig.netpols, (item) => item.metadata.name === name)
  }

  // =====================================
  // == SETTINGS CRUD ==
  // =====================================

  public getSettings(): Team {
    return this.teamConfig.settings
  }

  public updateSettings(updates: Partial<Team>): Team {
    if (!this.teamConfig.settings) {
      this.teamConfig.settings = { name: updates.name || '' }
    }
    return merge(this.teamConfig.settings, updates)
  }

  // =====================================
  // == APPS CRUD ==
  // =====================================

  public createApp(app: App): App {
    this.teamConfig.apps ??= []
    const newApp = { ...app, id: app.id ?? uuidv4() }
    if (find(this.teamConfig.apps, { id: newApp.id })) {
      throw new AlreadyExists(`App[${app.id}] already exists.`)
    }
    this.teamConfig.apps.push(newApp)
    return newApp
  }

  public getApp(id: string): App {
    const app = find(this.teamConfig.apps, { id })
    if (!app) {
      throw new NotExistError(`App[${id}] does not exist.`)
    }
    return app
  }

  public getApps(): App[] {
    const teamId = this.teamConfig.settings?.id
    return (this.teamConfig.apps ?? []).map((app) => ({
      ...app,
      teamId,
    }))
  }

  public setApps(apps: App[]) {
    this.teamConfig.apps = apps
  }

  // =====================================
  // == POLICIES CRUD ==
  // =====================================

  public getPolicies(): Policies {
    return this.teamConfig.policies
  }

  public getPolicy(key: string): Policy {
    return this.teamConfig.policies[key]
  }

  public updatePolicies(updates: Partial<Policies>): void {
    if (!this.teamConfig.policies) {
      this.teamConfig.policies = {}
    }
    merge(this.teamConfig.policies, updates)
  }

  public doesProjectNameExist(name: string): boolean {
    return (
      (this.teamConfig.builds && this.teamConfig.builds.some((build) => build.metadata.name === name)) ||
      (this.teamConfig.workloads && this.teamConfig.workloads.some((workload) => workload.metadata.name === name)) ||
      (this.teamConfig.services && this.teamConfig.services.some((service) => service.metadata.name === name))
    )
  }

  /** Retrieve a collection dynamically from the Teamconfig */
  public getCollection(collectionId: string): any {
    if (!has(this.teamConfig, collectionId)) {
      throw new Error(`Getting TeamConfig collection [${collectionId}] does not exist.`)
    }
    return this.teamConfig[collectionId]
  }

  /** Update a collection dynamically in the Teamconfig */
  public updateCollection(collectionId: string, data: any): void {
    set(this.teamConfig, collectionId, data)
  }
}
