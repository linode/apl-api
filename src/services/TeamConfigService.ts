import { find, has, merge, omit, pick, remove, set } from 'lodash'
import { v4 as uuidv4 } from 'uuid'
import { AlreadyExists, NotExistError } from '../error'
import {
  AplBuildRequest,
  AplBuildResponse,
  AplCodeRepoRequest,
  AplCodeRepoResponse,
  AplRequestObject,
  AplResourceKind,
  AplResponseObject,
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
    return this.getV1Object(newWorkload) as Workload
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
    return this.getV1Object(workload) as Workload
  }

  public getAplWorkload(name: string): AplWorkloadResponse {
    const workload = find(this.teamConfig.workloads, (item) => item.metadata.name === name)
    if (!workload) {
      throw new NotExistError(`Workload[${name}] does not exist.`)
    }
    return workload
  }

  public getWorkloads(): Workload[] {
    return this.getAplWorkloads().map((workload) => this.getV1Object(workload) as Workload)
  }

  public getAplWorkloads(): AplWorkloadResponse[] {
    return this.teamConfig.workloads ?? []
  }

  public updateWorkload(name: string, updates: Partial<Workload>): Workload {
    const mergeObj = this.getV1MergeObject(updates) as Partial<AplWorkloadRequest>
    const mergedWorkload = this.updateAplWorkload(name, mergeObj)
    return this.getV1Object(mergedWorkload) as Workload
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
    workload.spec.values = workloadValues.values
    return pick(this.getV1Object(workload), ['id', 'teamId', 'name', 'values']) as WorkloadValues
  }

  public getWorkloadValues(name: string): WorkloadValues {
    const workload = this.getAplWorkload(name)
    return pick(this.getV1Object(workload), ['id', 'teamId', 'name', 'values']) as WorkloadValues
  }

  public updateWorkloadValues(name: string, updates: Partial<WorkloadValues>): WorkloadValues {
    const workload = this.getAplWorkload(name)
    merge(workload.spec.values, updates.values)
    return pick(this.getV1Object(workload), ['id', 'teamId', 'name', 'values']) as WorkloadValues
  }

  public deleteWorkloadValues(name: string): void {
    // TODO: remove function
    // remove(this.teamConfig.workloadValues, { name })
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
    this.teamConfig.sealedsecrets ??= []
    const newSecret = { ...secret, id: secret.id ?? uuidv4() }
    if (find(this.teamConfig.sealedsecrets, { name: newSecret.name })) {
      throw new AlreadyExists(`SealedSecret[${newSecret.name}] already exists.`)
    }
    this.teamConfig.sealedsecrets.push(newSecret)
    return newSecret
  }

  public getSealedSecret(name: string): SealedSecret {
    const sealedSecrets = find(this.teamConfig.sealedsecrets, { name })
    if (!sealedSecrets) {
      throw new NotExistError(`SealedSecret[${name}] does not exist.`)
    }
    return sealedSecrets
  }

  public getSealedSecrets(): SealedSecret[] {
    const teamId = this.teamConfig.settings?.id
    return (this.teamConfig.sealedsecrets ?? []).map((sealedSecret) => ({
      ...sealedSecret,
      teamId,
    }))
  }

  public updateSealedSecret(name: string, updates: Partial<SealedSecret>): SealedSecret {
    const secret = find(this.teamConfig.sealedsecrets, { name })
    if (!secret) throw new NotExistError(`SealedSecret[${name}] does not exist.`)
    return merge(secret, updates)
  }

  public deleteSealedSecret(name: string): void {
    remove(this.teamConfig.sealedsecrets, { name })
  }

  // =====================================
  // == BACKUPS CRUD ==
  // =====================================

  public createBackup(backup: Backup): Backup {
    this.teamConfig.backups ??= []
    const newBackup = { ...backup, id: backup.id ?? uuidv4() }
    if (find(this.teamConfig.backups, { name: newBackup.name })) {
      throw new AlreadyExists(`Backup[${newBackup.name}] already exists.`)
    }
    this.teamConfig.backups.push(newBackup)
    return newBackup
  }

  public getBackup(name: string): Backup {
    const backup = find(this.teamConfig.backups, { name })
    if (!backup) {
      throw new NotExistError(`Backup[${name}] does not exist.`)
    }
    return backup
  }

  public getBackups(): Backup[] {
    const teamId = this.teamConfig.settings?.id
    return (this.teamConfig.backups ?? []).map((backup) => ({
      ...backup,
      teamId,
    }))
  }

  public updateBackup(name: string, updates: Partial<Backup>): Backup {
    const backup = find(this.teamConfig.backups, { name })
    if (!backup) throw new NotExistError(`Backup[${name}] does not exist.`)
    return merge(backup, updates)
  }

  public deleteBackup(name: string): void {
    remove(this.teamConfig.backups, { name })
  }

  // =====================================
  // == PROJECTS CRUD ==
  // =====================================

  public createProject(project: Project): Project {
    this.teamConfig.projects ??= []
    const newProject = { ...project, id: project.id ?? uuidv4() }
    if (find(this.teamConfig.projects, { name: newProject.name })) {
      throw new AlreadyExists(`Project[${newProject.name}] already exists.`)
    }
    this.teamConfig.projects.push(newProject)
    return newProject
  }

  public getProject(name: string): Project {
    const project = find(this.teamConfig.projects, { name })
    if (!project) {
      throw new NotExistError(`Project[${name}] does not exist.`)
    }
    return project
  }

  public getProjects(): Project[] {
    const teamId = this.teamConfig.settings?.id
    return (this.teamConfig.projects ?? []).map((project) => ({
      ...project,
      teamId,
    }))
  }

  public updateProject(name: string, updates: Partial<Project>): Project {
    const project = find(this.teamConfig.projects, { name })
    if (!project) throw new NotExistError(`Project[${name}] does not exist.`)
    return merge(project, updates)
  }

  public deleteProject(name: string): void {
    remove(this.teamConfig.projects, { name })
  }

  // =====================================
  // == NETPOLS CRUD ==
  // =====================================

  public createNetpol(netpol: Netpol): Netpol {
    this.teamConfig.netpols ??= []
    const newNetpol = { ...netpol, id: netpol.id ?? uuidv4() }
    if (find(this.teamConfig.netpols, { name: newNetpol.name })) {
      throw new AlreadyExists(`Netpol[${newNetpol.name}] already exists.`)
    }
    this.teamConfig.netpols.push(newNetpol)
    return newNetpol
  }

  public getNetpol(name: string): Netpol {
    const netpol = find(this.teamConfig.netpols, { name })
    if (!netpol) {
      throw new NotExistError(`Netpol[${name}] does not exist.`)
    }
    return netpol
  }

  public getNetpols(): Netpol[] {
    const teamId = this.teamConfig.settings?.id
    return (this.teamConfig.netpols ?? []).map((netpol) => ({
      ...netpol,
      teamId,
    }))
  }

  public updateNetpol(name: string, updates: Partial<Netpol>): Netpol {
    const netpol = find(this.teamConfig.netpols, { name })
    if (!netpol) {
      throw new NotExistError(`Netpol[${name}] does not exist.`)
    }
    return merge(netpol, updates)
  }

  public deleteNetpol(name: string): void {
    remove(this.teamConfig.netpols, { name })
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
