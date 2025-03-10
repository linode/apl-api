import { find, has, map, mapValues, merge, remove, set } from 'lodash'
import { v4 as uuidv4 } from 'uuid'
import { AlreadyExists } from '../error'
import {
  Alerts,
  App,
  Backup,
  Build,
  Cluster,
  CodeRepo,
  Dns,
  Ingress,
  Kms,
  Netpol,
  Otomi,
  Policies,
  Project,
  Repo,
  SealedSecret,
  Service,
  Settings,
  Smtp,
  Team,
  TeamConfig,
  User,
  Versions,
  Workload,
} from '../otomi-models'
import { TeamConfigService } from './TeamConfigService'

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

  public getTeamConfigService(teamId: string): TeamConfigService {
    if (!this.repo.teamConfig[teamId]) {
      throw new Error(`TeamConfig for ${teamId} does not exist.`)
    }

    // Check if we already have an instance cached
    if (!this.teamConfigServiceCache.has(teamId)) {
      // If not, create a new one and store it in the cache
      this.teamConfigServiceCache.set(teamId, new TeamConfigService(this.repo.teamConfig[teamId]))
    }

    // Return the cached instance
    return this.teamConfigServiceCache.get(teamId)!
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
    return merge(app, updates)
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
    return merge(user, updates)
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
      projects: [],
      netpols: [],
      settings: {} as Team,
      apps: [],
      policies: {} as Policies,
    }
  }

  public createTeamConfig(teamName: string, team: Team): TeamConfig {
    if (has(this.repo.teamConfig, teamName)) {
      throw new AlreadyExists(`TeamConfig[${teamName}] already exists.`)
    }
    const newTeam = this.getDefaultTeamConfig()
    newTeam.settings = team
    newTeam.settings.id = teamName
    this.repo.teamConfig[teamName] = newTeam
    return this.repo.teamConfig[teamName]
  }

  public getTeamConfig(teamId: string): TeamConfig | undefined {
    return this.repo.teamConfig[teamId]
  }

  public deleteTeamConfig(teamId: string): void {
    if (!has(this.repo.teamConfig, teamId)) {
      throw new Error(`TeamConfig[${teamId}] does not exist.`)
    }
    delete this.repo.teamConfig[teamId]
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
    merge(this.repo, updates)
  }

  public getRepo(): Repo {
    return this.repo
  }

  public setRepo(repo: Repo): void {
    this.repo = repo
  }

  public getAllTeamSettings(): Team[] {
    return map(this.repo.teamConfig, 'settings').filter(Boolean) ?? []
  }

  public getAllNetpols(): Netpol[] {
    return Object.keys(this.repo.teamConfig).flatMap((teamId) => this.getTeamConfigService(teamId).getNetpols())
  }

  public getAllProjects(): Project[] {
    return Object.keys(this.repo.teamConfig).flatMap((teamId) => this.getTeamConfigService(teamId).getProjects())
  }

  public getAllBuilds(): Build[] {
    return Object.keys(this.repo.teamConfig).flatMap((teamId) => this.getTeamConfigService(teamId).getBuilds())
  }

  public getAllPolicies(): Record<string, Policies> {
    return mapValues(this.repo.teamConfig, 'policies')
  }

  public getAllWorkloads(): Workload[] {
    return Object.keys(this.repo.teamConfig).flatMap((teamId) => this.getTeamConfigService(teamId).getWorkloads())
  }

  public getAllServices(): Service[] {
    return Object.keys(this.repo.teamConfig).flatMap((teamId) => this.getTeamConfigService(teamId).getServices())
  }

  public getAllSealedSecrets(): SealedSecret[] {
    return Object.keys(this.repo.teamConfig).flatMap((teamId) => this.getTeamConfigService(teamId).getSealedSecrets())
  }

  public getAllBackups(): Backup[] {
    return Object.keys(this.repo.teamConfig).flatMap((teamId) => this.getTeamConfigService(teamId).getBackups())
  }

  public getAllCodeRepos(): CodeRepo[] {
    return Object.keys(this.repo.teamConfig).flatMap((teamId) => this.getTeamConfigService(teamId).getCodeRepos())
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
