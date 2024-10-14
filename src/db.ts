import { debug } from 'console'
import cloneDeep from 'lodash/cloneDeep'
import findIndex from 'lodash/findIndex'
import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import Memory from 'lowdb/adapters/Memory'
import { AlreadyExists, NotExistError } from 'src/error'
import {
  App,
  Backup,
  Build,
  Cloudtty,
  Cluster,
  Netpol,
  Policies,
  Project,
  SealedSecret,
  Secret,
  Service,
  Settings,
  Team,
  User,
  Workload,
  WorkloadValues,
} from 'src/otomi-models'
import { mergeData } from 'src/utils'
import { v4 as uuidv4 } from 'uuid'

export type DbType =
  | Backup
  | Build
  | Cloudtty
  | Cluster
  | Netpol
  | SealedSecret
  | Secret
  | Service
  | Team
  | Settings
  | App
  | Workload
  | WorkloadValues
  | User
  | Project
  | Policies
export type Schema = {
  apps: App[]
  sealedsecrets: SealedSecret[]
  secrets: Secret[]
  services: Service[]
  netpols: Netpol[]
  settings: Settings
  teams: Team[]
  workloads: Workload[]
  workloadValues: WorkloadValues[]
  builds: Build[]
  policies: Record<string, Policies>
  cloudttys: Cloudtty[]
  users: User[]
  projects: Project[]
}

export default class Db {
  db: low.LowdbSync<any>

  constructor(path?: string) {
    // @ts-ignore
    this.db = low(path === undefined ? new Memory<Schema>('') : new FileSync<Schema>(path))
    this.db._.mixin({
      replaceRecord(arr: Record<string, any>[], currentObject: Record<string, any>, newObject: Record<string, any>) {
        return arr.splice(findIndex(arr, currentObject), 1, newObject)
      },
    })
    // Set some defaults (required if your JSON file is empty)
    this.db
      .defaults({
        apps: [],
        backups: [],
        builds: [],
        cloudttys: [],
        netpols: [],
        users: [],
        projects: [],
        policies: {},
        sealedsecrets: [],
        secrets: [],
        services: [],
        settings: {},
        teams: [],
        workloads: [],
        workloadValues: [],
      })
      .write()
  }

  getItem(name: string, selector: any): DbType {
    // By default data is returned by reference, this means that modifications to returned objects may change the database.
    // To avoid such behavior, we use .cloneDeep().
    const data = this.getItemReference(name, selector)
    return cloneDeep(data)
  }

  getItemReference(type: string, selector: any, mustThrow = true): DbType | undefined {
    const coll = this.db.get(type)
    // @ts-ignore
    const data = coll.find(selector).value()
    if (data === undefined) {
      debug(`Selector props do not exist in '${type}': ${JSON.stringify(selector)}`)
      if (mustThrow) throw new NotExistError()
      else return
    }
    if (data?.length) {
      debug(`More than one item found for '${type}' with selector: ${JSON.stringify(selector)}`)
      if (mustThrow) throw new NotExistError()
      else return
    }
    return data
  }

  getCollection(type: string, selector?: any): Array<DbType> {
    // @ts-ignore
    return this.db.get(type).filter(selector).value()
  }

  populateItem(type: string, data: DbType, selector?: any, id?: string): DbType | undefined {
    // @ts-ignore
    if (selector && this.db.get(type).find(selector).value()) return undefined
    return (
      this.db
        .get(type)
        // @ts-ignore
        .push(data)
        .last()
        .assign({ id: id || uuidv4() })
        .write()
    )
  }

  createItem(type: string, data: Record<string, any>, selector?: Record<string, any>, id?: string): DbType {
    // @ts-ignore
    if (selector && this.db.get(type).find(selector).value())
      throw new AlreadyExists(`Item already exists in '${type}' collection: ${JSON.stringify(selector)}`)
    const cleanData = { ...data, ...selector }
    const ret = this.populateItem(type, cleanData, selector, id)
    return ret
  }

  deleteItem(type: string, selector: any): void {
    this.getItemReference(type, selector)
    // @ts-ignore
    this.db.get(type).remove(selector).write()
  }

  updateItem(type: string, data: Record<string, any>, selector: Record<string, any>, merge = false): DbType {
    const prev = this.getItemReference(type, selector)
    const col = this.db.get(type)
    // @ts-ignore
    const idx = col.findIndex(selector).value()
    const merged = (merge && prev ? mergeData(prev, data) : data) as Record<string, any>
    const newData = { ...merged, ...selector }
    col.value().splice(idx, 1, newData)
    return newData
  }
}
