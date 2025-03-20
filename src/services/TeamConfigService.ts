import { find, has, merge, omit, remove, set } from 'lodash'
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
  AplPolicyRequest,
  AplPolicyResponse,
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
  DeepPartial,
  ResourceTeamMetadata,
  ServiceSpec,
  Team,
  TeamConfig,
  V1ApiObject,
} from '../otomi-models'

export function getAplObject(kind: AplResourceKind, spec: V1ApiObject | ServiceSpec): AplRequestObject {
  return {
    kind,
    metadata: {
      name: spec.name,
    },
    spec: omit(spec, ['id', 'teamId', 'name']),
  } as AplRequestObject
}

export function getV1Object(aplObject: AplResponseObject): V1ApiObject {
  return {
    id: aplObject.metadata.labels['apl.io/id'],
    teamId: aplObject.metadata.labels['apl.io/teamId'],
    name: aplObject.metadata.name,
    ...aplObject.spec,
  }
}

export function getV1MergeObject(updates: DeepPartial<V1ApiObject | ServiceSpec>): DeepPartial<AplRequestObject> {
  return {
    metadata: updates.name
      ? {
          name: updates.name,
        }
      : undefined,
    spec: omit(updates, ['id', 'teamId', 'name']),
  }
}

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
    this.teamConfig.policies ??= []
  }

  private createMetadata(name: string, id?: string): ResourceTeamMetadata {
    return {
      name,
      labels: {
        'apl.io/id': id ?? uuidv4(),
        'apl.io/teamId': this.teamConfig.settings.name,
      },
    }
  }

  private createAplObject(name: string, request: AplRequestObject, id?: string): AplResponseObject {
    return {
      kind: request.kind,
      metadata: this.createMetadata(name, id),
      spec: request.spec,
      status: {},
    } as AplResponseObject
  }

  private updateAplObject(config: AplResponseObject, updates: AplRequestObject): AplResponseObject {
    merge(config.metadata, { name: updates.metadata?.name })
    Object.assign(config.spec, updates.spec)
    return config
  }

  private getAplMergeObject(updates: DeepPartial<AplRequestObject>): DeepPartial<AplRequestObject> {
    return {
      metadata: updates.metadata?.name
        ? {
            name: updates.metadata?.name,
          }
        : undefined,
      spec: updates.spec || undefined,
    } as Partial<AplRequestObject>
  }

  // =====================================
  // == BUILDS CRUD ==
  // =====================================

  public createBuild(build: AplBuildRequest): AplBuildResponse {
    const { name } = build.metadata
    if (find(this.teamConfig.builds, (item) => item.metadata.name === name)) {
      throw new AlreadyExists(`Build[${name}] already exists.`)
    }

    const newBuild = this.createAplObject(name, build) as AplBuildResponse
    this.teamConfig.builds.push(newBuild)
    return newBuild
  }

  public getBuild(name: string): AplBuildResponse {
    const build = find(this.teamConfig.builds, (item) => item.metadata.name === name)
    if (!build) {
      throw new NotExistError(`Build[${name}] does not exist.`)
    }
    return build
  }

  public getBuilds(): AplBuildResponse[] {
    return this.teamConfig.builds ?? []
  }

  public updateBuild(name: string, updates: AplBuildRequest): AplBuildResponse {
    const build = this.getBuild(name)
    return this.updateAplObject(build, updates) as AplBuildResponse
  }

  public patchBuild(name: string, updates: DeepPartial<AplBuildRequest>): AplBuildResponse {
    const build = this.getBuild(name)
    const mergeObj = this.getAplMergeObject(updates)
    return merge(build, mergeObj)
  }

  public deleteBuild(name: string): void {
    remove(this.teamConfig.builds, (item) => item.metadata.name === name)
  }

  // =====================================
  // == CODEREPOS CRUD ==
  // =====================================

  public createCodeRepo(codeRepo: AplCodeRepoRequest): AplCodeRepoResponse {
    const { name } = codeRepo.metadata
    if (find(this.teamConfig.codeRepos, (item) => item.metadata.name === name)) {
      throw new AlreadyExists(`CodeRepo[${name}] already exists.`)
    }

    const newCodeRepo = this.createAplObject(name, codeRepo) as AplCodeRepoResponse
    this.teamConfig.codeRepos.push(newCodeRepo)
    return newCodeRepo
  }

  public getCodeRepo(name: string): AplCodeRepoResponse {
    const codeRepo = find(this.teamConfig.codeRepos, (item) => item.metadata.name === name)
    if (!codeRepo) {
      throw new NotExistError(`CodeRepo[${name}] does not exist.`)
    }
    return codeRepo
  }

  public getCodeRepos(): AplCodeRepoResponse[] {
    return this.teamConfig.codeRepos ?? []
  }

  public updateCodeRepo(name: string, updates: AplCodeRepoRequest): AplCodeRepoResponse {
    const codeRepo = this.getCodeRepo(name)
    return this.updateAplObject(codeRepo, updates) as AplCodeRepoResponse
  }

  public patchCodeRepo(name: string, updates: DeepPartial<AplCodeRepoRequest>): AplCodeRepoResponse {
    const codeRepo = this.getCodeRepo(name)
    const mergeObj = this.getAplMergeObject(updates)
    return merge(codeRepo, mergeObj)
  }

  public deleteCodeRepo(name: string): void {
    remove(this.teamConfig.codeRepos, (item) => item.metadata.name === name)
  }

  // =====================================
  // == WORKLOADS CRUD ==
  // =====================================

  public createWorkload(workload: AplWorkloadRequest): AplWorkloadResponse {
    const { name } = workload.metadata
    if (find(this.teamConfig.workloads, (item) => item.metadata.name === name)) {
      throw new AlreadyExists(`Workload[${name}] already exists.`)
    }

    const newWorkload = this.createAplObject(name, workload) as AplWorkloadResponse
    this.teamConfig.workloads.push(newWorkload)
    return newWorkload
  }

  public getWorkload(name: string): AplWorkloadResponse {
    const workload = find(this.teamConfig.workloads, (item) => item.metadata.name === name)
    if (!workload) {
      throw new NotExistError(`Workload[${name}] does not exist.`)
    }
    return workload
  }

  public getWorkloads(): AplWorkloadResponse[] {
    return this.teamConfig.workloads ?? []
  }

  public updateWorkload(name: string, updates: AplWorkloadRequest): AplWorkloadResponse {
    const workload = this.getWorkload(name)
    return this.updateAplObject(workload, updates) as AplWorkloadResponse
  }

  public patchWorkload(name: string, updates: DeepPartial<AplWorkloadRequest>): AplWorkloadResponse {
    const workload = this.getWorkload(name)
    const mergeObj = this.getAplMergeObject(updates)
    return merge(workload, mergeObj)
  }

  public deleteWorkload(name: string): void {
    remove(this.teamConfig.workloads, (item) => item.metadata.name === name)
  }

  // =====================================
  // == SERVICES CRUD ==
  // =====================================

  public createService(service: AplServiceRequest): AplServiceResponse {
    const { name } = service.metadata
    if (find(this.teamConfig.services, (item) => item.metadata.name === name)) {
      throw new AlreadyExists(`Service[${name}] already exists.`)
    }

    const newService = this.createAplObject(name, service) as AplServiceResponse
    this.teamConfig.services.push(newService)
    return newService
  }

  public getService(name: string): AplServiceResponse {
    const service = find(this.teamConfig.services, (item) => item.metadata.name === name)
    if (!service) {
      throw new NotExistError(`Service[${name}] does not exist.`)
    }
    return service
  }

  public getServices(): AplServiceResponse[] {
    return this.teamConfig.services ?? []
  }

  public updateService(name: string, updates: AplServiceRequest): AplServiceResponse {
    const service = this.getService(name)
    return this.updateAplObject(service, updates) as AplServiceResponse
  }

  public patchService(name: string, updates: DeepPartial<AplServiceRequest>): AplServiceResponse {
    const service = this.getService(name)
    const mergeObj = this.getAplMergeObject(updates)
    return merge(service, mergeObj)
  }

  public deleteService(name: string): void {
    remove(this.teamConfig.services, (item) => item.metadata.name === name)
  }

  // =====================================
  // == SEALED SECRETS CRUD ==
  // =====================================

  public createSealedSecret(secret: AplSecretRequest): AplSecretResponse {
    const { name } = secret.metadata
    if (find(this.teamConfig.sealedsecrets, (item) => item.metadata.name === name)) {
      throw new AlreadyExists(`SealedSecret[${name}] already exists.`)
    }

    const newSecret = this.createAplObject(name, secret) as AplSecretResponse
    this.teamConfig.sealedsecrets.push(newSecret)
    return newSecret
  }

  public getSealedSecret(name: string): AplSecretResponse {
    const secret = find(this.teamConfig.sealedsecrets, (item) => item.metadata.name === name)
    if (!secret) {
      throw new NotExistError(`SealedSecret[${name}] does not exist.`)
    }
    return secret
  }

  public getSealedSecrets(): AplSecretResponse[] {
    return this.teamConfig.sealedsecrets ?? []
  }

  public updateSealedSecret(name: string, updates: AplSecretRequest): AplSecretResponse {
    const secret = this.getSealedSecret(name)
    return this.updateAplObject(secret, updates) as AplSecretResponse
  }

  public patchSealedSecret(name: string, updates: DeepPartial<AplSecretRequest>): AplSecretResponse {
    const secret = this.getSealedSecret(name)
    const mergeObj = this.getAplMergeObject(updates)
    return merge(secret, mergeObj)
  }

  public deleteSealedSecret(name: string): void {
    remove(this.teamConfig.sealedsecrets, (item) => item.metadata.name === name)
  }

  // =====================================
  // == BACKUPS CRUD ==
  // =====================================

  public createBackup(backup: AplBackupRequest): AplBackupResponse {
    const { name } = backup.metadata
    if (find(this.teamConfig.backups, (item) => item.metadata.name === name)) {
      throw new AlreadyExists(`Backup[${name}] already exists.`)
    }

    const newBackup = this.createAplObject(name, backup) as AplBackupResponse
    this.teamConfig.backups.push(newBackup)
    return newBackup
  }

  public getBackup(name: string): AplBackupResponse {
    const backup = find(this.teamConfig.backups, (item) => item.metadata.name === name)
    if (!backup) {
      throw new NotExistError(`Backup[${name}] does not exist.`)
    }
    return backup
  }

  public getBackups(): AplBackupResponse[] {
    return this.teamConfig.backups ?? []
  }

  public updateBackup(name: string, updates: AplBackupRequest): AplBackupResponse {
    const backup = this.getBackup(name)
    return this.updateAplObject(backup, updates) as AplBackupResponse
  }

  public patchBackup(name: string, updates: DeepPartial<AplBackupRequest>): AplBackupResponse {
    const backup = this.getBackup(name)
    const mergeObj = this.getAplMergeObject(updates)
    return merge(backup, mergeObj)
  }

  public deleteBackup(name: string): void {
    remove(this.teamConfig.backups, (item) => item.metadata.name === name)
  }

  // =====================================
  // == PROJECTS CRUD ==
  // =====================================

  public createProject(project: AplProjectRequest): AplProjectResponse {
    const { name } = project.metadata
    if (find(this.teamConfig.projects, (item) => item.metadata.name === name)) {
      throw new AlreadyExists(`Project[${name}] already exists.`)
    }

    const newProject = this.createAplObject(name, {
      kind: project.kind,
      metadata: project.metadata,
      spec: {},
    }) as AplProjectResponse
    this.teamConfig.projects.push(newProject)
    return newProject
  }

  public getProject(name: string): AplProjectResponse {
    const project = find(this.teamConfig.projects, (item) => item.metadata.name === name)
    if (!project) {
      throw new NotExistError(`Project[${name}] does not exist.`)
    }
    return project
  }

  public getProjects(): AplProjectResponse[] {
    return this.teamConfig.projects ?? []
  }

  public deleteProject(name: string): void {
    remove(this.teamConfig.projects, (item) => item.metadata.name === name)
  }

  // =====================================
  // == NETPOLS CRUD ==
  // =====================================

  public createNetpol(netpol: AplNetpolRequest): AplNetpolResponse {
    const { name } = netpol.metadata
    if (find(this.teamConfig.netpols, (item) => item.metadata.name === name)) {
      throw new AlreadyExists(`Netpol[${name}] already exists.`)
    }

    const newNetpol = this.createAplObject(name, netpol) as AplNetpolResponse
    this.teamConfig.netpols.push(newNetpol)
    return newNetpol
  }

  public getNetpol(name: string): AplNetpolResponse {
    const netpol = find(this.teamConfig.netpols, (item) => item.metadata.name === name)
    if (!netpol) {
      throw new NotExistError(`Netpol[${name}] does not exist.`)
    }
    return netpol
  }

  public getNetpols(): AplNetpolResponse[] {
    return this.teamConfig.netpols ?? []
  }

  public updateNetpol(name: string, updates: AplNetpolRequest): AplNetpolResponse {
    const netpol = this.getNetpol(name)
    return this.updateAplObject(netpol, updates) as AplNetpolResponse
  }

  public patchNetpol(name: string, updates: DeepPartial<AplNetpolRequest>): AplNetpolResponse {
    const netpol = this.getNetpol(name)
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

  public getPolicy(name: string): AplPolicyResponse {
    const policy = find(this.teamConfig.policies, (item) => item.metadata.name === name)
    if (!policy) {
      throw new NotExistError(`Policy[${name}] does not exist.`)
    }
    return policy
  }

  public getPolicies(): AplPolicyResponse[] {
    return this.teamConfig.policies ?? []
  }

  public updatePolicies(name: string, updates: AplPolicyRequest): AplPolicyResponse {
    const policy = find(this.teamConfig.policies, (item) => item.metadata.name === name)
    if (!policy) {
      const newPolicy = this.createAplObject(
        name,
        {
          metadata: { name },
          kind: 'AplTeamPolicy',
          spec: updates.spec,
        },
        `${this.teamConfig.settings.name}-${name}`,
      ) as AplPolicyResponse
      this.teamConfig.policies.push(newPolicy)
      return newPolicy
    } else {
      Object.assign(policy.spec, updates)
      return policy
    }
  }

  public patchPolicies(name: string, updates: DeepPartial<AplPolicyRequest>): AplPolicyResponse {
    const policy = find(this.teamConfig.policies, (item) => item.metadata.name === name)
    if (!policy) {
      const newPolicy = this.createAplObject(
        name,
        {
          metadata: { name },
          kind: 'AplTeamPolicy',
          spec: {
            action: updates.spec?.action || 'Audit',
            severity: updates.spec?.severity || 'medium',
          },
        },
        `${this.teamConfig.settings.name}-${name}`,
      ) as AplPolicyResponse
      this.teamConfig.policies.push(newPolicy)
      return newPolicy
    } else {
      const mergeObj = this.getAplMergeObject(updates)
      return merge(policy, mergeObj)
    }
  }

  public doesProjectNameExist(name: string): boolean {
    return (
      (this.teamConfig.builds && this.teamConfig.builds.some((build) => build.metadata.name === name)) ||
      (this.teamConfig.workloads && this.teamConfig.workloads.some((workload) => workload.metadata.name === name)) ||
      (this.teamConfig.services && this.teamConfig.services.some((service) => service.metadata.name === name))
    )
  }

  /** Retrieve a collection dynamically from the Teamconfig */
  public getCollection(collectionId: string): AplResponseObject[] {
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
