import {
  Alerts,
  App,
  Build,
  Cluster,
  Dns,
  Ingress,
  Kms,
  Netpol,
  Oidc,
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
  Workload,
} from '../otomi-models'
import { TeamConfigService } from './TeamConfigService'
import { find, flatMap, has, map, mapValues, merge, remove } from 'lodash'
import { v4 as uuidv4 } from 'uuid'

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
    this.repo.oidc ??= {} as Oidc
    this.repo.otomi ??= {} as Otomi
    this.repo.platformBackups ??= {}
    this.repo.smtp ??= {} as Smtp
    this.repo.users ??= []
    this.repo.versions ??= {}
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

  // =====================================
  // == APPS CRUD (Dictionary) ==
  // =====================================

  public getApp(id: string): App {
    const app = find(this.repo.apps, { id })
    if (!app) {
      throw new Error(`User[${id}] does not exist.`)
    }
    return app
  }

  public getApps(): App[] {
    return this.repo.apps
  }

  public updateApp(id: string, updates: Partial<App>): App {
    const app = find(this.repo.apps, { id })
    if (!app) {
      throw new Error(`App[${id}] does not exist.`)
    }
    return merge(app, updates)
  }

  // =====================================
  // == USERS CRUD (Array) ==
  // =====================================

  public createUser(user: User): User {
    const newUser = { ...user, id: user.id ?? uuidv4() }
    if (find(this.repo.users, { id: newUser.id })) {
      throw new Error(`User[${user.id}] already exists.`)
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
    return this.repo.users
  }

  public getUsersEmail(): string[] {
    return map(this.repo.users, 'email')
  }

  public updateUser(id: string, updates: Partial<User>): User {
    const user = find(this.repo.users, { id })
    if (!user) throw new Error(`User[${id}] does not exist.`)
    return merge(user, updates)
  }

  public deleteUser(id: string): void {
    remove(this.repo.users, { id })
  }

  // =====================================
  // == TEAM CONFIG CRUD (Dictionary) ==
  // =====================================
  private getDefaultTeamConfig(): TeamConfig {
    return {
      builds: [],
      workloads: [],
      services: [],
      sealedSecrets: [],
      backups: [],
      projects: [],
      netpols: [],
      settings: {} as Team,
      apps: [],
      policies: {} as Policies,
      workloadValues: [],
    }
  }

  public createTeamConfig(teamId: string, team: Team): TeamConfig {
    if (has(this.repo.teamConfig, teamId)) {
      throw new Error(`TeamConfig[${teamId}] already exists.`)
    }
    const newTeam = merge({}, this.getDefaultTeamConfig(), team)
    newTeam.id ??= uuidv4()
    this.repo.teamConfig[teamId] = newTeam
    return this.repo.teamConfig[teamId]
  }

  public getTeamConfig(teamId: string): TeamConfig | undefined {
    return this.repo.teamConfig[teamId]
  }

  public updateTeamConfig(teamId: string, updates: Partial<TeamConfig>): void {
    if (!has(this.repo.teamConfig, teamId)) {
      throw new Error(`TeamConfig[${teamId}] does not exist.`)
    }
    merge(this.repo.teamConfig[teamId], updates)
  }

  public deleteTeamConfig(teamId: string): void {
    if (!has(this.repo.teamConfig, teamId)) {
      throw new Error(`TeamConfig[${teamId}] does not exist.`)
    }
    delete this.repo.teamConfig[teamId]
  }

  // =====================================
  // == SINGLE OBJECT CRUD (alerts, cluster, dns, etc.) ==
  // =====================================

  public getAlerts(): Alerts {
    return this.repo.alerts
  }

  public updateAlerts(updates: Partial<Alerts>): void {
    merge(this.repo.alerts, updates)
  }

  public getCluster(): Cluster {
    return this.repo.cluster
  }

  public updateCluster(updates: Partial<Cluster>): void {
    merge(this.repo.cluster, updates)
  }

  public getDns(): Dns {
    return this.repo.dns
  }

  public updateDns(updates: Partial<Dns>): void {
    merge(this.repo.dns, updates)
  }

  public getIngress(): Ingress {
    return this.repo.ingress
  }

  public updateIngress(updates: Partial<Ingress>): void {
    merge(this.repo.ingress, updates)
  }

  public getKms(): Kms {
    return this.repo.kms
  }

  public updateKms(updates: Partial<Kms>): void {
    if (!this.repo.kms) {
      throw new Error(`KMS object does not exist.`)
    }
    merge(this.repo.kms, updates)
  }

  public getOidc(): Oidc {
    return this.repo.oidc
  }

  public updateOidc(updates: Partial<Oidc>): void {
    merge(this.repo.oidc, updates)
  }

  public getOtomi(): Otomi {
    return this.repo.otomi
  }

  public updateOtomi(updates: Partial<Otomi>): void {
    merge(this.repo.otomi, updates)
  }

  public getSmtp(): Smtp {
    return this.repo.smtp
  }

  public updateSmtp(updates: Partial<Smtp>): void {
    merge(this.repo.smtp, updates)
  }

  // =====================================
  // == OTHER DICTIONARIES (databases, obj, versions, etc.) ==
  // =====================================

  public createDatabase(key: string, database: any) {
    if (has(this.repo.databases, key)) {
      throw new Error(`Database[${key}] already exists.`)
    }
    const newDatabase = { ...database, id: database.id ?? uuidv4() }

    this.repo.databases[key] = newDatabase
    return newDatabase
  }

  public getDatabase(key: string): any | undefined {
    return this.repo.databases[key]
  }

  public updateDatabase(key: string, updates: any): void {
    if (!has(this.repo.databases, key)) {
      throw new Error(`Database[${key}] does not exist.`)
    }
    merge(this.repo.databases[key], updates)
  }

  public deleteDatabase(key: string): void {
    if (!has(this.repo.databases, key)) {
      throw new Error(`Database[${key}] does not exist.`)
    }
    delete this.repo.databases[key]
  }

  public createVersion(key: string, version: any) {
    if (has(this.repo.versions, key)) {
      throw new Error(`Version[${key}] already exists.`)
    }
    const newVersion = { ...version, id: version.id ?? uuidv4() }
    this.repo.versions[key] = newVersion
    return newVersion
  }

  public getVersion(key: string): any | undefined {
    return this.repo.versions[key]
  }

  public updateVersion(key: string, updates: any): void {
    if (!has(this.repo.versions, key)) {
      throw new Error(`Version[${key}] does not exist.`)
    }
    merge(this.repo.versions[key], updates)
  }

  public deleteVersion(key: string): void {
    if (!has(this.repo.versions, key)) {
      throw new Error(`Version[${key}] does not exist.`)
    }
    delete this.repo.versions[key]
  }

  public createObj(key: string, obj: any) {
    if (has(this.repo.obj, key)) {
      throw new Error(`Obj[${key}] already exists.`)
    }
    const newObj = { ...obj, id: obj.id ?? uuidv4() }
    this.repo.obj[key] = newObj
    return newObj
  }

  public getObj(): any | undefined {
    return this.repo.obj
  }

  public updateObj(key: string, updates: any): void {
    if (!has(this.repo.obj, key)) {
      throw new Error(`Obj[${key}] does not exist.`)
    }
    merge(this.repo.obj[key], updates)
  }

  public deleteObj(key: string): void {
    if (!has(this.repo.obj, key)) {
      throw new Error(`Obj[${key}] does not exist.`)
    }
    delete this.repo.obj[key]
  }

  public createPlatformBackups(key: string, platformBackup: any) {
    if (has(this.repo.platformBackups, key)) {
      throw new Error(`PlatformBackups[${key}] already exists.`)
    }
    const newBackup = { ...platformBackup, id: platformBackup.id ?? uuidv4() }
    this.repo.platformBackups[key] = newBackup
    return newBackup
  }

  public getPlatformBackups(): any | undefined {
    return this.repo.platformBackups
  }

  public getPlatformBackup(key: string): any | undefined {
    return this.repo.platformBackups[key]
  }

  public updatePlatformBackups(key: string, updates: any): void {
    if (!has(this.repo.platformBackups, key)) {
      throw new Error(`PlatformBackups[${key}] does not exist.`)
    }
    merge(this.repo.platformBackups[key], updates)
  }

  public deletePlatformBackups(key: string): void {
    if (!has(this.repo.platformBackups, key)) {
      throw new Error(`Obj[${key}] does not exist.`)
    }
    delete this.repo.platformBackups[key]
  }

  public getSettings(): Settings {
    return {
      alerts: this.repo.alerts,
      cluster: this.repo.cluster,
      dns: this.repo.dns,
      ingress: this.repo.ingress,
      kms: this.repo.kms,
      obj: this.repo.obj,
      oidc: this.repo.oidc,
      otomi: this.repo.otomi,
      platformBackups: this.repo.platformBackups,
      smtp: this.repo.smtp,
    } as Settings
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
    return map(this.repo.teamConfig, 'settings').filter(Boolean)
  }

  public getAllNetpols(): Netpol[] {
    return flatMap(this.repo.teamConfig, 'netpols').filter(Boolean)
  }

  public getAllProjects(): Project[] {
    return flatMap(this.repo.teamConfig, 'projects').filter(Boolean)
  }

  public getAllBuilds(): Build[] {
    return flatMap(this.repo.teamConfig, 'builds').filter(Boolean)
  }

  public getAllPolicies(): Record<string, Policies> {
    return mapValues(this.repo.teamConfig, 'policies')
  }

  public getAllWorkloads(): Workload[] {
    return flatMap(this.repo.teamConfig, 'workloads').filter(Boolean)
  }

  public getAllServices(): Service[] {
    return flatMap(this.repo.teamConfig, 'services').filter(Boolean)
  }

  public getAllSealedSecrets(): SealedSecret[] {
    return flatMap(this.repo.teamConfig, 'sealedSecrets').filter(Boolean)
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
    merge(this.repo[collectionId], data)
  }
}
