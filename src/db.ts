import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import Memory from 'lowdb/adapters/Memory'
import findIndex from 'lodash/findIndex'
import { v4 as uuidv4 } from 'uuid'
import cloneDeep from 'lodash/cloneDeep'
import { AlreadyExists, NotExistError } from './error'
import { Cluster, Secret, Service, Settings, Team } from './otomi-models'

export type DbType = Cluster | Secret | Service | Team | Settings
export type Schema = {
  clusters: Cluster[]
  secrets: Secret[]
  services: Service[]
  settings: Settings
  teams: Team[]
}

export default class Db {
  db: low.LowdbSync<any>

  dirty: boolean

  dirtyActive: boolean

  constructor(path?: string) {
    // @ts-ignore
    this.db = low(path === undefined ? new Memory<Schema>('') : new FileSync<Schema>(path))
    this.db._.mixin({
      replaceRecord(arr, currentObject, newObject) {
        return arr.splice(findIndex(arr, currentObject), 1, newObject)
      },
    })
    // Set some defaults (required if your JSON file is empty)
    this.db
      .defaults({
        cluster: [],
        secrets: [],
        services: [],
        settings: {},
        teams: [],
      })
      .write()
    this.dirty = false
    this.dirtyActive = false
  }

  getItem(name: string, selector: any): DbType {
    // By default data is returned by reference, this means that modifications to returned objects may change the database.
    // To avoid such behavior, we use .cloneDeep().
    const data = this.getItemReference(name, selector)
    return cloneDeep(data)
  }

  getItemReference(type: string, selector: any): DbType {
    const coll = this.db.get(type)
    // @ts-ignore
    const data = coll.find(selector).value()
    if (data === undefined) {
      console.error(`Selector props do not exist in '${type}': ${JSON.stringify(selector)}`)
      throw new NotExistError()
    }
    if (data.length) {
      console.error(`More than one item found for '${type}' with selector: ${JSON.stringify(selector)}`)
      throw new NotExistError()
    }
    return data
  }

  getCollection(type: string, selector?: any): Array<DbType> {
    // @ts-ignore
    return this.db.get(type).filter(selector).value()
  }

  populateItem(type: string, data: DbType, selector?: any, id?: string): Array<DbType> | undefined {
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

  createItem(type: string, data: any, selector?: any, id?: string): DbType {
    // @ts-ignore
    if (selector && this.db.get(type).find(selector).value())
      throw new AlreadyExists(`Item already exists in '${type}' collection: ${JSON.stringify(selector)}`)
    const ret = this.populateItem(type, data, selector, id)
    this.dirty = this.dirtyActive
    return ret as DbType
  }

  deleteItem(type: string, selector: any): void {
    this.getItemReference(type, selector)
    // @ts-ignore
    this.db.get(type).remove(selector).write()
    this.dirty = this.dirtyActive
  }

  updateItem(type: string, data: any, selector: any): DbType {
    this.getItemReference(type, selector)
    // @ts-ignore
    const ret = this.db.get(type).find(selector).assign(data).write()
    this.dirty = this.dirtyActive
    return ret as DbType
  }

  setDirtyActive(active = true): void {
    this.dirtyActive = active
  }

  isDirty(): boolean {
    return !!this.dirty
  }
}
