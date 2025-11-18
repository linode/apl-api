import { cloneDeep, find, has, merge, omit, remove, set } from 'lodash'
import { v4 as uuidv4 } from 'uuid'
import { AkamaiAgentCR } from '../ai/AkamaiAgentCR'
import { AkamaiKnowledgeBaseCR } from '../ai/AkamaiKnowledgeBaseCR'
import { AlreadyExists, NotExistError, ValidationError } from '../error'
import {
  AplAgentRequest,
  AplAgentResponse,
  AplBuildRequest,
  AplBuildResponse,
  AplCodeRepoRequest,
  AplCodeRepoResponse,
  AplKnowledgeBaseRequest,
  AplKnowledgeBaseResponse,
  AplNetpolRequest,
  AplNetpolResponse,
  AplPolicyRequest,
  AplPolicyResponse,
  AplRequestObject,
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
  DeepPartial,
  TeamConfig,
} from '../otomi-models'
import { createAplObject, getAplMergeObject, updateAplObject } from '../utils/manifests'

function mergeCustomizer(prev, next) {
  return next
}

export class TeamConfigService {
  constructor(private teamConfig: TeamConfig) {
    this.teamConfig.codeRepos ??= []
    this.teamConfig.builds ??= []
    this.teamConfig.workloads ??= []
    this.teamConfig.services ??= []
    this.teamConfig.sealedsecrets ??= []
    this.teamConfig.knowledgeBases ??= []
    this.teamConfig.agents ??= []
    this.teamConfig.netpols ??= []
    this.teamConfig.apps ??= []
    this.teamConfig.policies ??= []
  }

  private createAplObject(name: string, request: AplRequestObject): AplResponseObject {
    return createAplObject(name, request, this.teamConfig.settings.metadata.name)
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
    return updateAplObject(build, updates) as AplBuildResponse
  }

  public patchBuild(name: string, updates: DeepPartial<AplBuildRequest>): AplBuildResponse {
    const build = this.getBuild(name)
    const mergeObj = getAplMergeObject(updates)
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
    return updateAplObject(codeRepo, updates) as AplCodeRepoResponse
  }

  public patchCodeRepo(name: string, updates: DeepPartial<AplCodeRepoRequest>): AplCodeRepoResponse {
    const codeRepo = this.getCodeRepo(name)
    const mergeObj = getAplMergeObject(updates)
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
    return (this.teamConfig.workloads ?? []).map((workload) => omit(workload, 'spec.values'))
  }

  public updateWorkload(name: string, updates: AplWorkloadRequest): AplWorkloadResponse {
    const workload = this.getWorkload(name)
    return updateAplObject(workload, updates) as AplWorkloadResponse
  }

  public patchWorkload(name: string, updates: DeepPartial<AplWorkloadRequest>): AplWorkloadResponse {
    const workload = this.getWorkload(name)
    const mergeObj = getAplMergeObject(updates)
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
    return updateAplObject(service, updates) as AplServiceResponse
  }

  public patchService(name: string, updates: DeepPartial<AplServiceRequest>): AplServiceResponse {
    const service = this.getService(name)
    const mergeObj = getAplMergeObject(updates)
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
    return updateAplObject(secret, updates) as AplSecretResponse
  }

  public patchSealedSecret(name: string, updates: DeepPartial<AplSecretRequest>): AplSecretResponse {
    const secret = this.getSealedSecret(name)
    const mergeObj = getAplMergeObject(updates)
    return merge(secret, mergeObj)
  }

  public deleteSealedSecret(name: string): void {
    remove(this.teamConfig.sealedsecrets, (item) => item.metadata.name === name)
  }

  // =====================================
  // == KNOWLEDGE BASE CRUD ==
  // =====================================

  public createKnowledgeBase(knowledgeBase: AplKnowledgeBaseRequest): AplKnowledgeBaseResponse {
    const { name } = knowledgeBase.metadata
    if (find(this.teamConfig.knowledgeBases, (item) => item.metadata.name === name)) {
      throw new AlreadyExists(`KnowledgeBase[${name}] already exists.`)
    }

    const newKnowledgeBase = this.createAplObject(name, knowledgeBase) as AplKnowledgeBaseResponse
    this.teamConfig.knowledgeBases.push(newKnowledgeBase)
    return newKnowledgeBase
  }

  public getKnowledgeBase(name: string): AplKnowledgeBaseResponse {
    const knowledgeBase = find(this.teamConfig.knowledgeBases, (item) => item.metadata.name === name)
    if (!knowledgeBase) {
      throw new NotExistError(`KnowledgeBase[${name}] does not exist.`)
    }
    // If the knowledge base has pipeline parameters, it's a full CR that needs transformation
    if (knowledgeBase.spec && 'pipelineParameters' in knowledgeBase.spec) {
      return AkamaiKnowledgeBaseCR.fromCR(knowledgeBase as any).toApiResponse(this.teamConfig.settings.metadata.name)
    }
    return knowledgeBase
  }

  public getKnowledgeBases(): AplKnowledgeBaseResponse[] {
    const knowledgeBases = this.teamConfig.knowledgeBases ?? []
    return knowledgeBases.map((kb) => {
      // If the knowledge base has pipeline parameters, it's a full CR that needs transformation
      if (kb.spec && 'pipelineParameters' in kb.spec) {
        return AkamaiKnowledgeBaseCR.fromCR(kb as any).toApiResponse(this.teamConfig.settings.metadata.name)
      }
      return kb
    })
  }

  public updateKnowledgeBase(name: string, updates: AplKnowledgeBaseRequest): AplKnowledgeBaseResponse {
    const knowledgeBase = this.getKnowledgeBase(name)
    return updateAplObject(knowledgeBase, updates) as AplKnowledgeBaseResponse
  }

  public patchKnowledgeBase(name: string, updates: DeepPartial<AplKnowledgeBaseRequest>): AplKnowledgeBaseResponse {
    const knowledgeBase = this.getKnowledgeBase(name)
    const mergeObj = getAplMergeObject(updates)
    return merge(knowledgeBase, mergeObj)
  }

  public deleteKnowledgeBase(name: string): void {
    remove(this.teamConfig.knowledgeBases, (item) => item.metadata.name === name)
  }

  public validateKnowledgeBaseExists(knowledgeBaseName: string): boolean {
    const knowledgeBases = this.teamConfig.knowledgeBases ?? []
    return knowledgeBases.some((kb) => kb.metadata.name === knowledgeBaseName)
  }

  // =====================================
  // == AGENT CRUD ==
  // =====================================

  public createAgent(agent: AplAgentRequest): AplAgentResponse {
    const { name } = agent.metadata
    if (find(this.teamConfig.agents, (item) => item.metadata.name === name)) {
      throw new AlreadyExists(`Agent[${name}] already exists.`)
    }

    // Validate that knowledgeBase exists if specified in tools
    if (agent.spec.tools) {
      for (const tool of agent.spec.tools) {
        if (tool.type === 'knowledgeBase' && tool.name) {
          const toolName = tool.name as string
          if (!this.validateKnowledgeBaseExists(toolName)) {
            throw new ValidationError(`KnowledgeBase[${toolName}] does not exist.`)
          }
        }
      }
    }

    const newAgent = this.createAplObject(name, agent) as AplAgentResponse
    this.teamConfig.agents.push(newAgent)
    return newAgent
  }

  public getAgent(name: string): AplAgentResponse {
    const agent = find(this.teamConfig.agents, (item) => item.metadata.name === name)
    if (!agent) {
      throw new NotExistError(`Agent[${name}] does not exist.`)
    }
    if (agent.spec && 'foundationModel' in agent.spec) {
      return AkamaiAgentCR.fromCR(agent as any).toApiResponse(this.teamConfig.settings.metadata.name)
    }
    return agent
  }

  public getAgents(): AplAgentResponse[] {
    return this.teamConfig.agents.map((agent) => {
      if (agent.spec && 'foundationModel' in agent.spec) {
        return AkamaiAgentCR.fromCR(agent as any).toApiResponse(this.teamConfig.settings.metadata.name)
      }
      return agent
    })
  }

  public updateAgent(name: string, updates: AplAgentRequest): AplAgentResponse {
    const agent = this.getAgent(name)
    // Validate that knowledgeBase exists if specified in tools
    if (updates.spec.tools) {
      for (const tool of updates.spec.tools) {
        if (tool.type === 'knowledgeBase' && tool.name) {
          const toolName = tool.name as string
          if (!this.validateKnowledgeBaseExists(toolName)) {
            throw new ValidationError(`KnowledgeBase[${toolName}] does not exist.`)
          }
        }
      }
    }
    return updateAplObject(agent, updates) as AplAgentResponse
  }

  public patchAgent(name: string, updates: DeepPartial<AplAgentRequest>): AplAgentResponse {
    const agent = this.getAgent(name)
    // Validate that knowledgeBase exists if specified in tools
    if (updates.spec?.tools) {
      for (const tool of updates.spec.tools) {
        if (tool && tool.type === 'knowledgeBase' && typeof tool.name === 'string') {
          const toolName = tool.name as string
          if (!this.validateKnowledgeBaseExists(toolName)) {
            throw new ValidationError(`KnowledgeBase[${toolName}] does not exist.`)
          }
        }
      }
    }
    const mergeObj = getAplMergeObject(updates)
    return merge(agent, mergeObj)
  }

  public deleteAgent(name: string): void {
    remove(this.teamConfig.agents, (item) => item.metadata.name === name)
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
    return updateAplObject(netpol, updates) as AplNetpolResponse
  }

  public patchNetpol(name: string, updates: DeepPartial<AplNetpolRequest>): AplNetpolResponse {
    const netpol = this.getNetpol(name)
    const mergeObj = getAplMergeObject(updates)
    return merge(netpol, mergeObj)
  }

  public deleteNetpol(name: string): void {
    remove(this.teamConfig.netpols, (item) => item.metadata.name === name)
  }

  // =====================================
  // == SETTINGS CRUD ==
  // =====================================

  public getSettings(): AplTeamSettingsResponse {
    return this.teamConfig.settings
  }

  public updateSettings(updates: DeepPartial<AplTeamSettingsRequest>): AplTeamSettingsResponse {
    Object.assign(this.teamConfig.settings.spec, cloneDeep(updates.spec))
    return this.teamConfig.settings
  }

  public patchSettings(updates: DeepPartial<AplTeamSettingsRequest>): AplTeamSettingsResponse {
    const mergeObj = getAplMergeObject(updates)
    return merge(this.teamConfig.settings, mergeObj)
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
    const teamId = this.teamConfig.settings?.metadata?.name
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
      const newPolicy = this.createAplObject(name, {
        metadata: { name },
        kind: 'AplTeamPolicy',
        spec: updates.spec,
      }) as AplPolicyResponse
      this.teamConfig.policies.push(newPolicy)
      return newPolicy
    } else {
      Object.assign(policy.spec, updates.spec)
      return policy
    }
  }

  public patchPolicies(name: string, updates: DeepPartial<AplPolicyRequest>): AplPolicyResponse {
    const policy = find(this.teamConfig.policies, (item) => item.metadata.name === name)
    if (!policy) {
      const newPolicy = this.createAplObject(name, {
        metadata: { name },
        kind: 'AplTeamPolicy',
        spec: {
          action: updates.spec?.action || 'Audit',
          severity: updates.spec?.severity || 'medium',
        },
      }) as AplPolicyResponse
      this.teamConfig.policies.push(newPolicy)
      return newPolicy
    } else {
      const mergeObj = getAplMergeObject(updates)
      return merge(policy, mergeObj)
    }
  }

  /** Retrieve a collection dynamically from the Teamconfig
   * Try not to use this function */
  public getCollection(collectionId: string): AplResponseObject[] {
    if (!has(this.teamConfig, collectionId)) {
      throw new Error(`Getting TeamConfig collection [${collectionId}] does not exist.`)
    }
    return this.teamConfig[collectionId] as any
  }

  /** Update a collection dynamically in the Teamconfig */
  public updateCollection(collectionId: string, data: any): void {
    set(this.teamConfig, collectionId, data)
  }
}
