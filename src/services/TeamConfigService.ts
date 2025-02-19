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
import { find, has, merge, remove } from 'lodash'
import { NotExistError } from '../error'
import { v4 as uuidv4 } from 'uuid'

export class TeamConfigService {
  constructor(private teamConfig: TeamConfig) {}

  // =====================================
  // == BUILDS CRUD ==
  // =====================================

  public createBuild(build: Build): Build {
    const newBuild = { ...build, id: build.id ?? uuidv4() }
    if (find(this.teamConfig.builds, { id: newBuild.id })) {
      throw new Error(`Build[${newBuild.id}] already exists.`)
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
    return this.teamConfig.builds
  }

  public updateBuild(id: string, updates: Partial<Build>): Build {
    const build = find(this.teamConfig.builds, { id })
    if (!build) throw new Error(`Build[${id}] does not exist.`)
    return merge(build, updates)
  }

  public deleteBuild(id: string): void {
    remove(this.teamConfig.builds, { id })
  }

  // =====================================
  // == WORKLOADS CRUD ==
  // =====================================

  public createWorkload(workload: Workload): Workload {
    const newWorkload = { ...workload, id: workload.id ?? uuidv4() }
    if (find(this.teamConfig.workloads, { id: newWorkload.id })) {
      throw new Error(`Workload[${newWorkload.id}] already exists.`)
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
    return this.teamConfig.workloads
  }

  public updateWorkload(id: string, updates: Partial<Workload>): Workload {
    const workload = find(this.teamConfig.workloads, { id })
    if (!workload) throw new Error(`Workload[${id}] does not exist.`)
    return merge(workload, updates)
  }

  public deleteWorkload(id: string): void {
    remove(this.teamConfig.workloads, { id })
  }

  // =====================================
  // == WORKLOADVALUES CRUD ==
  // =====================================

  public createWorkloadValues(workloadValues: WorkloadValues): WorkloadValues {
    const newWorkloadValues = { ...workloadValues, id: workloadValues.id ?? uuidv4() }
    if (find(this.teamConfig.workloadValues, { id: newWorkloadValues.id })) {
      throw new Error(`WorkloadValues[${newWorkloadValues.id}] already exists.`)
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
    if (!workloadValues) throw new Error(`WorkloadValues[${id}] does not exist.`)
    return merge(workloadValues, updates)
  }

  public deleteWorkloadValues(id: string): void {
    remove(this.teamConfig.workloadValues, { id })
  }

  // =====================================
  // == SERVICES CRUD ==
  // =====================================

  public createService(service: Service): Service {
    const newService = { ...service, id: service.id ?? uuidv4() }
    if (find(this.teamConfig.services, { id: newService.id })) {
      throw new Error(`Service[${newService.id}] already exists.`)
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
    return this.teamConfig.services
  }
  public updateService(id: string, updates: Partial<Service>): Service {
    const service = find(this.teamConfig.services, { id })
    if (!service) throw new Error(`Service[${id}] does not exist.`)
    return merge(service, updates)
  }

  public deleteService(id: string): void {
    remove(this.teamConfig.services, { id })
  }

  // =====================================
  // == SEALED SECRETS CRUD ==
  // =====================================

  public createSealedSecret(secret: SealedSecret): SealedSecret {
    const newSecret = { ...secret, id: secret.id ?? uuidv4() }
    if (find(this.teamConfig.sealedSecrets, { id: newSecret.id })) {
      throw new Error(`SealedSecret[${newSecret.id}] already exists.`)
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
    return this.teamConfig.sealedSecrets
  }

  public updateSealedSecret(id: string, updates: Partial<SealedSecret>): SealedSecret {
    const secret = find(this.teamConfig.sealedSecrets, { id })
    if (!secret) throw new Error(`SealedSecret[${id}] does not exist.`)
    return merge(secret, updates)
  }

  public deleteSealedSecret(id: string): void {
    remove(this.teamConfig.sealedSecrets, { id })
  }

  // =====================================
  // == BACKUPS CRUD ==
  // =====================================

  public createBackup(backup: Backup): Backup {
    const newBackup = { ...backup, id: backup.id ?? uuidv4() }
    if (find(this.teamConfig.backups, { id: newBackup.id })) {
      throw new Error(`Backup[${newBackup.id}] already exists.`)
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
    return this.teamConfig.backups
  }

  public updateBackup(id: string, updates: Partial<Backup>): Backup {
    const backup = find(this.teamConfig.backups, { id })
    if (!backup) throw new Error(`Backup[${id}] does not exist.`)
    return merge(backup, updates)
  }

  public deleteBackup(id: string): void {
    remove(this.teamConfig.backups, { id })
  }

  // =====================================
  // == PROJECTS CRUD ==
  // =====================================

  public createProject(project: Project): Project {
    const newProject = { ...project, id: project.id ?? uuidv4() }
    if (find(this.teamConfig.projects, { id: newProject.id })) {
      throw new Error(`Project[${newProject.id}] already exists.`)
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
    return this.teamConfig.projects
  }

  public updateProject(id: string, updates: Partial<Project>): Project {
    const project = find(this.teamConfig.projects, { id })
    if (!project) throw new Error(`Project[${id}] does not exist.`)
    return merge(project, updates)
  }

  public deleteProject(id: string): void {
    remove(this.teamConfig.projects, { id })
  }

  // =====================================
  // == NETPOLS CRUD ==
  // =====================================

  public createNetpol(netpol: Netpol): Netpol {
    const newNetpol = { ...netpol, id: netpol.id ?? uuidv4() }
    if (find(this.teamConfig.netpols, { id: newNetpol.id })) {
      throw new Error(`Netpol[${newNetpol.id}] already exists.`)
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
    return this.teamConfig.netpols
  }

  public updateNetpol(id: string, updates: Partial<Netpol>): Netpol {
    const netpol = find(this.teamConfig.netpols, { id })
    if (!netpol) {
      throw new Error(`Netpol[${id}] does not exist.`)
    }
    return merge(netpol, updates)
  }

  public deleteNetpol(id: string): void {
    remove(this.teamConfig.netpols, { id })
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
    const newApp = { ...app, id: app.id ?? uuidv4() }
    if (find(this.teamConfig.apps, { id: newApp.id })) {
      throw new Error(`App[${app.id}] already exists.`)
    }
    this.teamConfig.apps.push(newApp)
    return newApp
  }

  public getApp(id: string): App {
    const app = find(this.teamConfig.apps, { id })
    if (!app) {
      throw new Error(`App[${id}] does not exist.`)
    }
    return app
  }

  public getApps(): App[] {
    return this.teamConfig.apps
  }

  public updateApp(id: string, updates: Partial<App>): App {
    const app = find(this.teamConfig.apps, { id })
    if (!app) throw new Error(`App[${id}] does not exist.`)
    return merge(app, updates)
  }

  public deleteApp(id: string): void {
    remove(this.teamConfig.apps, { id })
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
      this.teamConfig.builds.some((build) => build.name === name) ||
      this.teamConfig.workloads.some((workload) => workload.name === name) ||
      this.teamConfig.services.some((service) => service.name === name)
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
    if (!has(this.teamConfig, collectionId)) {
      throw new Error(`Updating TeamConfig collection [${collectionId}] does not exist.`)
    }
    merge(this.teamConfig[collectionId], data)
  }
}
