import {
  App,
  Backup,
  Build,
  CodeRepo,
  Netpol,
  Policies,
  Policy,
  Project,
  SealedSecret,
  Service,
  Team,
  TeamConfig,
  Workload,
  WorkloadValues,
} from '../otomi-models'
import { find, has, merge, remove, set } from 'lodash'
import { AlreadyExists, NotExistError } from '../error'
import { v4 as uuidv4 } from 'uuid'

export class TeamConfigService {
  constructor(private teamConfig: TeamConfig) {
    this.teamConfig.builds ??= []
    this.teamConfig.workloads ??= []
    this.teamConfig.workloadValues ??= []
    this.teamConfig.services ??= []
    this.teamConfig.sealedSecrets ??= []
    this.teamConfig.backups ??= []
    this.teamConfig.projects ??= []
    this.teamConfig.netpols ??= []
    this.teamConfig.apps ??= []
    this.teamConfig.policies ??= {}
  }

  // =====================================
  // == BUILDS CRUD ==
  // =====================================

  public createBuild(build: Build): Build {
    this.teamConfig.builds ??= []
    const newBuild = { ...build, id: build.id ?? uuidv4() }
    if (find(this.teamConfig.builds, { name: newBuild.name })) {
      throw new AlreadyExists(`Build[${newBuild.name}] already exists.`)
    }
    this.teamConfig.builds.push(newBuild)
    return newBuild
  }

  public getBuild(name: string): Build {
    const build = find(this.teamConfig.builds, { name })
    if (!build) {
      throw new NotExistError(`Build[${name}] does not exist.`)
    }
    return build
  }

  public getBuilds(): Build[] {
    const teamId = this.teamConfig.settings?.id
    return (this.teamConfig.builds ?? []).map((build) => ({
      ...build,
      teamId,
    }))
  }

  public updateBuild(name: string, updates: Partial<Build>): Build {
    const build = find(this.teamConfig.builds, { name })
    if (!build) throw new NotExistError(`Build[${name}] does not exist.`)
    return merge(build, updates)
  }

  public deleteBuild(name: string): void {
    remove(this.teamConfig.builds, { name })
  }

  // =====================================
  // == CODEREPOS CRUD ==
  // =====================================

  public createCodeRepo(codeRepo: CodeRepo): CodeRepo {
    this.teamConfig.codeRepos ??= []
    const newCodeRepo = { ...codeRepo, id: codeRepo.id ?? uuidv4() }
    if (find(this.teamConfig.codeRepos, { name: newCodeRepo.id })) {
      throw new AlreadyExists(`CodeRepo[${newCodeRepo.id}] already exists.`)
    }
    this.teamConfig.codeRepos.push(newCodeRepo)
    return newCodeRepo
  }

  public getCodeRepo(id: string): CodeRepo {
    const codeRepo = find(this.teamConfig.codeRepos, { id })
    if (!codeRepo) {
      throw new NotExistError(`CodeRepo[${id}] does not exist.`)
    }
    return codeRepo
  }

  public getCodeRepos(): CodeRepo[] {
    const teamId = this.teamConfig.settings?.id
    return (this.teamConfig.codeRepos ?? []).map((codeRepo) => ({
      ...codeRepo,
      teamId,
    }))
  }

  public updateCodeRepo(id: string, updates: Partial<CodeRepo>): CodeRepo {
    const codeRepo = find(this.teamConfig.codeRepos, { id })
    if (!codeRepo) throw new NotExistError(`CodeRepo[${id}] does not exist.`)
    return merge(codeRepo, updates)
  }

  public deleteCodeRepo(id: string): void {
    remove(this.teamConfig.codeRepos, { id })
  }

  // =====================================
  // == WORKLOADS CRUD ==
  // =====================================

  public createWorkload(workload: Workload): Workload {
    this.teamConfig.workloads ??= []
    const newWorkload = { ...workload, id: workload.id ?? uuidv4() }
    if (find(this.teamConfig.workloads, { name: newWorkload.name })) {
      throw new AlreadyExists(`Workload[${newWorkload.name}] already exists.`)
    }

    this.teamConfig.workloads.push(newWorkload)
    return newWorkload
  }

  public getWorkload(name: string): Workload {
    const workload = find(this.teamConfig.workloads, { name })
    if (!workload) {
      throw new NotExistError(`Workload[${name}] does not exist.`)
    }
    return workload
  }

  public getWorkloads(): Workload[] {
    const teamId = this.teamConfig.settings?.id
    return (this.teamConfig.workloads ?? []).map((workloadValues) => ({
      ...workloadValues,
      teamId,
    }))
  }

  public updateWorkload(name: string, updates: Partial<Workload>): Workload {
    const workload = find(this.teamConfig.workloads, { name })
    if (!workload) throw new NotExistError(`Workload[${name}] does not exist.`)
    return merge(workload, updates)
  }

  public deleteWorkload(name: string): void {
    remove(this.teamConfig.workloads, { name })
  }

  // =====================================
  // == WORKLOADVALUES CRUD ==
  // =====================================

  public createWorkloadValues(workloadValues: WorkloadValues): WorkloadValues {
    this.teamConfig.workloadValues ??= []
    const newWorkloadValues = { ...workloadValues, id: workloadValues.id ?? uuidv4() }
    if (
      find(this.teamConfig.workloadValues, { name: newWorkloadValues.name }) ||
      find(this.teamConfig.workloadValues, { id: newWorkloadValues.id })
    ) {
      throw new AlreadyExists(`WorkloadValues[${newWorkloadValues.name}] already exists.`)
    }
    this.teamConfig.workloadValues.push(newWorkloadValues)
    return newWorkloadValues
  }

  public getWorkloadValues(name: string): WorkloadValues {
    const workloadValues = find(this.teamConfig.workloadValues, { name })
    if (!workloadValues) {
      throw new NotExistError(`WorkloadValues[${name}] does not exist.`)
    }
    return workloadValues
  }

  public updateWorkloadValues(name: string, updates: Partial<WorkloadValues>): WorkloadValues {
    const workloadValues = find(this.teamConfig.workloadValues, { name })
    if (!workloadValues) throw new NotExistError(`WorkloadValues[${name}] does not exist.`)
    return merge(workloadValues, updates)
  }

  public deleteWorkloadValues(name: string): void {
    remove(this.teamConfig.workloadValues, { name })
  }

  // =====================================
  // == SERVICES CRUD ==
  // =====================================

  public createService(service: Service): Service {
    this.teamConfig.services ??= []
    const newService = { ...service, id: service.id ?? uuidv4() }
    if (find(this.teamConfig.services, { name: newService.name })) {
      throw new AlreadyExists(`Service[${newService.name}] already exists.`)
    }
    this.teamConfig.services.push(newService)
    return newService
  }

  public getService(name: string): Service {
    const service = find(this.teamConfig.services, { name })
    if (!service) {
      throw new NotExistError(`Service[${name}] does not exist.`)
    }
    return service
  }

  public getServices(): Service[] {
    const teamId = this.teamConfig.settings?.id
    return (this.teamConfig.services ?? []).map((service) => ({
      ...service,
      teamId,
    }))
  }

  public updateService(name: string, updates: Partial<Service>): Service {
    const service = find(this.teamConfig.services, { name })
    if (!service) throw new NotExistError(`Service[${name}] does not exist.`)
    return merge(service, updates)
  }

  public deleteService(name: string): void {
    remove(this.teamConfig.services, { name })
  }

  // =====================================
  // == SEALED SECRETS CRUD ==
  // =====================================

  public createSealedSecret(secret: SealedSecret): SealedSecret {
    this.teamConfig.sealedSecrets ??= []
    const newSecret = { ...secret, id: secret.id ?? uuidv4() }
    if (find(this.teamConfig.sealedSecrets, { name: newSecret.name })) {
      throw new AlreadyExists(`SealedSecret[${newSecret.name}] already exists.`)
    }
    this.teamConfig.sealedSecrets.push(newSecret)
    return newSecret
  }

  public getSealedSecret(name: string): SealedSecret {
    const sealedSecrets = find(this.teamConfig.sealedSecrets, { name })
    if (!sealedSecrets) {
      throw new NotExistError(`SealedSecret[${name}] does not exist.`)
    }
    return sealedSecrets
  }

  public getSealedSecrets(): SealedSecret[] {
    const teamId = this.teamConfig.settings?.id
    return (this.teamConfig.sealedSecrets ?? []).map((sealedSecret) => ({
      ...sealedSecret,
      teamId,
    }))
  }

  public updateSealedSecret(name: string, updates: Partial<SealedSecret>): SealedSecret {
    const secret = find(this.teamConfig.sealedSecrets, { name })
    if (!secret) throw new NotExistError(`SealedSecret[${name}] does not exist.`)
    return merge(secret, updates)
  }

  public deleteSealedSecret(name: string): void {
    remove(this.teamConfig.sealedSecrets, { name })
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
      (this.teamConfig.builds && this.teamConfig.builds.some((build) => build.name === name)) ||
      (this.teamConfig.workloads && this.teamConfig.workloads.some((workload) => workload.name === name)) ||
      (this.teamConfig.services && this.teamConfig.services.some((service) => service.name === name))
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
