import {
  App,
  Backup,
  Build,
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

  public getBuild(id: string): Build {
    const build = find(this.teamConfig.builds, { id })
    if (!build) {
      throw new NotExistError(`Build[${id}] does not exist.`)
    }
    return build
  }

  public getBuilds(): Build[] {
    return this.teamConfig.builds ?? []
  }

  public updateBuild(id: string, updates: Partial<Build>): Build {
    const build = find(this.teamConfig.builds, { id })
    if (!build) throw new NotExistError(`Build[${id}] does not exist.`)
    return merge(build, updates)
  }

  public deleteBuild(id: string): void {
    remove(this.teamConfig.builds, { id })
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

  public getWorkload(id: string): Workload {
    const workload = find(this.teamConfig.workloads, { id })
    if (!workload) {
      throw new NotExistError(`Workload[${id}] does not exist.`)
    }
    return workload
  }

  public getWorkloads(): Workload[] {
    return this.teamConfig.workloads ?? []
  }

  public updateWorkload(id: string, updates: Partial<Workload>): Workload {
    const workload = find(this.teamConfig.workloads, { id })
    if (!workload) throw new NotExistError(`Workload[${id}] does not exist.`)
    return merge(workload, updates)
  }

  public deleteWorkload(id: string): void {
    remove(this.teamConfig.workloads, { id })
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

  public getWorkloadValues(id: string): WorkloadValues {
    const workloadValues = find(this.teamConfig.workloadValues, { id })
    if (!workloadValues) {
      throw new NotExistError(`WorkloadValues[${id}] does not exist.`)
    }
    return workloadValues
  }

  public updateWorkloadValues(id: string, updates: Partial<WorkloadValues>): WorkloadValues {
    const workloadValues = find(this.teamConfig.workloadValues, { id })
    if (!workloadValues) throw new NotExistError(`WorkloadValues[${id}] does not exist.`)
    return merge(workloadValues, updates)
  }

  public deleteWorkloadValues(id: string): void {
    remove(this.teamConfig.workloadValues, { id })
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

  public getService(id: string): Service {
    const service = find(this.teamConfig.services, { id })
    if (!service) {
      throw new NotExistError(`Service[${id}] does not exist.`)
    }
    return service
  }

  public getServices(): Service[] {
    return this.teamConfig.services ?? []
  }
  public updateService(id: string, updates: Partial<Service>): Service {
    const service = find(this.teamConfig.services, { id })
    if (!service) throw new NotExistError(`Service[${id}] does not exist.`)
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

  public getSealedSecret(id: string): SealedSecret {
    const sealedSecrets = find(this.teamConfig.sealedSecrets, { id })
    if (!sealedSecrets) {
      throw new NotExistError(`SealedSecret[${id}] does not exist.`)
    }
    return sealedSecrets
  }

  public getSealedSecrets(): SealedSecret[] {
    return this.teamConfig.sealedSecrets ?? []
  }

  public updateSealedSecret(id: string, updates: Partial<SealedSecret>): SealedSecret {
    const secret = find(this.teamConfig.sealedSecrets, { id })
    if (!secret) throw new NotExistError(`SealedSecret[${id}] does not exist.`)
    return merge(secret, updates)
  }

  public deleteSealedSecret(id: string): void {
    remove(this.teamConfig.sealedSecrets, { id })
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

  public getBackup(id: string): Backup {
    const backup = find(this.teamConfig.backups, { id })
    if (!backup) {
      throw new NotExistError(`Backup[${id}] does not exist.`)
    }
    return backup
  }

  public getBackups(): Backup[] {
    return this.teamConfig.backups ?? []
  }

  public updateBackup(id: string, updates: Partial<Backup>): Backup {
    const backup = find(this.teamConfig.backups, { id })
    if (!backup) throw new NotExistError(`Backup[${id}] does not exist.`)
    return merge(backup, updates)
  }

  public deleteBackup(id: string): void {
    remove(this.teamConfig.backups, { id })
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

  public getProject(id: string): Project {
    const project = find(this.teamConfig.projects, { id })
    if (!project) {
      throw new NotExistError(`Project[${id}] does not exist.`)
    }
    return project
  }

  public getProjects(): Project[] {
    return this.teamConfig.projects ?? []
  }

  public updateProject(id: string, updates: Partial<Project>): Project {
    const project = find(this.teamConfig.projects, { id })
    if (!project) throw new NotExistError(`Project[${id}] does not exist.`)
    return merge(project, updates)
  }

  public deleteProject(id: string): void {
    remove(this.teamConfig.projects, { id })
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

  public getNetpol(id: string): Netpol {
    const netpol = find(this.teamConfig.netpols, { id })
    if (!netpol) {
      throw new NotExistError(`Netpol[${id}] does not exist.`)
    }
    return netpol
  }

  public getNetpols(): Netpol[] {
    return this.teamConfig.netpols ?? []
  }

  public updateNetpol(id: string, updates: Partial<Netpol>): Netpol {
    const netpol = find(this.teamConfig.netpols, { id })
    if (!netpol) {
      throw new NotExistError(`Netpol[${id}] does not exist.`)
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
    return this.teamConfig.apps ?? []
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
