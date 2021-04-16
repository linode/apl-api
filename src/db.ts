/* eslint-disable @typescript-eslint/ban-ts-ignore */
import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import Memory from 'lowdb/adapters/Memory'
import findIndex from 'lodash/findIndex'
import { v4 as uuidv4 } from 'uuid'
import cloneDeep from 'lodash/cloneDeep'
import { AlreadyExists, NotExistError } from './error'
import { Cloud, Cluster, Secret, Service, Settings, Team } from './otomi-models'

export type DbType = any // Cluster | Secret | Service | Team
export type Schema = {
  clouds: Cloud[]
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
        teams: [],
        services: [],
        clouds: [],
        clusters: [],
        secrets: [],
        settings: {},
      })
      .write()
    this.dirty = false
    this.dirtyActive = false
  }

  getItem(name: string, selector: object): DbType {
    // By default data is returned by reference, this means that modifications to returned objects may change the database.
    // To avoid such behavior, we use .cloneDeep().
    const data = this.getItemReference(name, selector)
    return cloneDeep(data)
  }

  getItemReference(type: string, selector: object): DbType {
    const coll = this.db.get(type)
    // @ts-ignore
    const data = coll.find(selector).value()
    if (data.length) {
      throw new NotExistError(`More than one item found for '${type}' with selector: ${JSON.stringify(selector)}`)
    }
    if (data === undefined) {
      throw new NotExistError(`Selector props do not exist in '${type}': ${JSON.stringify(selector)}`)
    }
    return data
  }

  getCollection(type: string, selector?: object): Array<DbType> {
    // @ts-ignore
    return this.db.get(type).filter(selector).value()
  }

  populateItem(type: string, data: DbType, selector?: object, id?: string): Array<DbType> {
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

  createItem(type: string, data: string | object, selector?: object, id?: string): DbType {
    // @ts-ignore
    if (selector && this.db.get(type).find(selector).value())
      throw new AlreadyExists(`Item already exists in '${type}' collection: ${JSON.stringify(selector)}`)
    const ret = this.populateItem(type, data, selector, id)
    this.dirty = this.dirtyActive
    return ret as DbType
  }

  deleteItem(type: string, selector: object): void {
    this.getItemReference(type, selector)
    // @ts-ignore
    this.db.get(type).remove(selector).write()
    this.dirty = this.dirtyActive
  }

  updateItem(type: string, data: DbType, selector: object): DbType {
    this.getItemReference(type, selector)
    // @ts-ignore
    const ret = this.db.get(type).find(selector).assign(data).write()
    this.dirty = this.dirtyActive
    return ret
  }

  setDirtyActive(active = true): void {
    this.dirtyActive = active
  }

  isDirty(): boolean {
    return !!this.dirty
  }
}
