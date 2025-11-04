import { find, has, map, mergeWith, remove, set } from 'lodash'
import { v4 as uuidv4 } from 'uuid'
import { AlreadyExists } from '../error'
import {
  Alerts,
  AplAgentResponse,
  AplBackupResponse,
  AplBuildResponse,
  AplCodeRepoResponse,
  AplKnowledgeBaseResponse,
  AplNetpolResponse,
  AplPolicyResponse,
  AplSecretResponse,
  AplServiceResponse,
  AplTeamSettingsRequest,
  AplTeamSettingsResponse,
  AplWorkloadResponse,
  App,
  Cluster,
  Dns,
  Ingress,
  Kms,
  Otomi,
  Repo,
  Settings,
  Smtp,
  TeamConfig,
  User,
  Versions,
} from '../otomi-models'
import { createAplObject } from '../utils/manifests'
import { TeamConfigService } from './TeamConfigService'

function mergeCustomizer(prev, next) {
  return next
}

export class RepoService {
  // We can create an LRU cache if needed with a lot of teams.
  private teamConfigServiceCache = new Map<string, TeamConfigService>()

  constructor(private repo: Repo) {
    this.repo.apps ??= []
    this.repo.alerts ??= {} as Alerts
    this.repo.cluster ??= {} as Cluster
    this.repo.databases ??= {}
    this.repo.dns ??= {} as Dns
    this.repo.ingress ??= {} as Ingress
    this.repo.kms ??= {} as Kms
    this.repo.obj ??= {}
    this.repo.otomi ??= {} as Otomi
    this.repo.platformBackups ??= {}
    this.repo.users ??= []
    this.repo.versions ??= {} as Versions
    this.repo.teamConfig ??= {}
  }

  public getTeamConfigService(teamName: string): TeamConfigService {
    if (!this.repo.teamConfig[teamName]) {
      throw new Error(`TeamConfig for ${teamName} does not exist.`)
    }

    // Check if we already have an instance cached
    if (!this.teamConfigServiceCache.has(teamName)) {
      // If not, create a new one and store it in the cache
      this.teamConfigServiceCache.set(teamName, new TeamConfigService(this.repo.teamConfig[teamName]))
    }

    // Return the cached instance
    return this.teamConfigServiceCache.get(teamName)!
  }

  public getApp(id: string): App {
    const app = find(this.repo.apps, { id })
    if (!app) {
      throw new Error(`App[${id}] does not exist.`)
    }
    return app
  }

  public getApps(): App[] {
    return this.repo.apps ?? []
  }

  public updateApp(id: string, updates: Partial<App>): App {
    const app = find(this.repo.apps, { id })
    if (!app) {
      throw new Error(`App[${id}] does not exist.`)
    }
    return mergeWith(app, updates, mergeCustomizer)
  }

  public deleteApp(id: string): void {
    remove(this.repo.apps, { id })
  }

  public createUser(user: User): User {
    const newUser = { ...user, id: user.id ?? uuidv4() }
    if (find(this.repo.users, { email: newUser.email })) {
      throw new AlreadyExists(`User[${user.email}] already exists.`)
    }
    this.repo.users.push(newUser)
    return newUser
  }

  public getUser(id: string): User {
    const user = find(this.repo.users, { id })
    if (!user) {
      throw new Error(`User[${id}] does not exist.`)
    }
    return user
  }

  public getUsers(): User[] {
    return this.repo.users ?? []
  }

  public getUsersEmail(): string[] {
    return map(this.repo.users, 'email')
  }

  public updateUser(id: string, updates: Partial<User>): User {
    const user = find(this.repo.users, { id })
    if (!user) throw new Error(`User[${id}] does not exist.`)
    return mergeWith(user, updates, mergeCustomizer)
  }

  public deleteUser(email: string): void {
    remove(this.repo.users, { email })
  }

  private getDefaultTeamConfig(): TeamConfig {
    return {
      builds: [],
      codeRepos: [],
      workloads: [],
      services: [],
      sealedsecrets: [],
      backups: [],
      knowledgeBases: [],
      agents: [],
      netpols: [],
      settings: {} as AplTeamSettingsResponse,
      apps: [],
      policies: [],
    }
  }

  public createTeamConfig(team: AplTeamSettingsRequest): TeamConfig {
    const teamName = team.metadata.name
    if (has(this.repo.teamConfig, teamName)) {
      throw new AlreadyExists(`TeamConfig[${teamName}] already exists.`)
    }
    const newTeam = this.getDefaultTeamConfig()
    newTeam.settings = createAplObject(teamName, team, teamName) as AplTeamSettingsResponse
    this.repo.teamConfig[teamName] = newTeam
    return this.repo.teamConfig[teamName]
  }

  public getTeamConfig(teamName: string): TeamConfig | undefined {
    return this.repo.teamConfig[teamName]
  }

  public deleteTeamConfig(teamName: string): void {
    if (!has(this.repo.teamConfig, teamName)) {
      throw new Error(`TeamConfig[${teamName}] does not exist.`)
    }
    delete this.repo.teamConfig[teamName]
    this.teamConfigServiceCache.delete(teamName)
  }

  public getCluster(): Cluster {
    return this.repo.cluster
  }

  public getDns(): Dns {
    return this.repo.dns
  }

  public getIngress(): Ingress {
    return this.repo.ingress
  }

  public getOtomi(): Otomi {
    return this.repo.otomi
  }

  public getSmtp(): Smtp {
    return this.repo.smtp
  }

  public getObj(): any | undefined {
    return this.repo.obj
  }

  public getPlatformBackups(): any | undefined {
    return this.repo.platformBackups
  }

  public getSettings(): Settings {
    const settings: Settings = {
      alerts: this.repo.alerts,
      cluster: this.repo.cluster,
      dns: this.repo.dns,
      ingress: this.repo.ingress,
      kms: this.repo.kms,
      obj: this.repo.obj,
      otomi: this.repo.otomi,
      platformBackups: this.repo.platformBackups,
    }

    if (this.repo.smtp) {
      settings.smtp = this.repo.smtp
    }
    if (this.repo.oidc) {
      settings.oidc = this.repo.oidc
    }

    return settings
  }

  public updateSettings(updates: Partial<Settings>): void {
    mergeWith(this.repo, updates, mergeCustomizer)
  }

  public getRepo(): Repo {
    return this.repo
  }

  public setRepo(repo: Repo): void {
    this.repo = repo
  }

  public getAllTeamSettings(): AplTeamSettingsResponse[] {
    return this.getTeamIds().flatMap((teamName) => this.getTeamConfigService(teamName).getSettings())
  }

  public getTeamIds(): string[] {
    return Object.keys(this.repo.teamConfig)
  }

  public getAllNetpols(): AplNetpolResponse[] {
    return this.getTeamIds().flatMap((teamName) => this.getTeamConfigService(teamName).getNetpols())
  }

  public getAllBuilds(): AplBuildResponse[] {
    return this.getTeamIds().flatMap((teamName) => this.getTeamConfigService(teamName).getBuilds())
  }

  public getAllPolicies(): AplPolicyResponse[] {
    return this.getTeamIds().flatMap((teamName) => this.getTeamConfigService(teamName).getPolicies())
  }

  public getAllWorkloads(): AplWorkloadResponse[] {
    return this.getTeamIds().flatMap((teamName) => this.getTeamConfigService(teamName).getWorkloads())
  }

  public getAllServices(): AplServiceResponse[] {
    return this.getTeamIds().flatMap((teamName) => this.getTeamConfigService(teamName).getServices())
  }

  public getAllSealedSecrets(): AplSecretResponse[] {
    return this.getTeamIds().flatMap((teamName) => this.getTeamConfigService(teamName).getSealedSecrets())
  }

  public getAllKnowledgeBases(): AplKnowledgeBaseResponse[] {
    return this.getTeamIds().flatMap((teamName) => this.getTeamConfigService(teamName).getKnowledgeBases())
  }

  public getAllAgents(): AplAgentResponse[] {
    return this.getTeamIds().flatMap((teamName) => this.getTeamConfigService(teamName).getAgents())
  }

  public getAllBackups(): AplBackupResponse[] {
    return this.getTeamIds().flatMap((teamName) => this.getTeamConfigService(teamName).getBackups())
  }

  public getAllCodeRepos(): AplCodeRepoResponse[] {
    return this.getTeamIds().flatMap((teamName) => this.getTeamConfigService(teamName).getCodeRepos())
  }

  /** Retrieve a collection dynamically from the Repo */
  public getCollection(collectionId: string): any {
    if (!has(this.repo, collectionId)) {
      throw new Error(`Getting repo collection [${collectionId}] does not exist.`)
    }
    return this.repo[collectionId]
  }

  /** Update a collection dynamically in the Repo */
  public updateCollection(collectionId: string, data: any): void {
    if (!has(this.repo, collectionId)) {
      throw new Error(`Updating repo collection [${collectionId}] does not exist.`)
    }
    set(this.repo, collectionId, data)
  }
}
