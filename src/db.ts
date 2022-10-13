import { debug } from 'console'
import cloneDeep from 'lodash/cloneDeep'
import findIndex from 'lodash/findIndex'
import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import Memory from 'lowdb/adapters/Memory'
import { v4 as uuidv4 } from 'uuid'
import { getIo } from './app'
import { AlreadyExists, NotExistError } from './error'
import { App, Cluster, Job, Secret, Service, Settings, Team } from './otomi-models'
import { mergeData, removeBlankAttributes } from './utils'

export type DbType = Cluster | Job | Secret | Service | Team | Settings | App
export type Schema = {
  apps: App[]
  jobs: Job[]
  secrets: Secret[]
  services: Service[]
  settings: Settings
  teams: Team[]
}

export default class Db {
  db: low.LowdbSync<any>

  dirty: boolean

  editor: string | undefined

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
        apps: [],
        jobs: [],
        secrets: [],
        services: [],
        settings: {},
        teams: [],
      })
      .write()
    this.dirty = false
    this.editor = undefined
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

  createItem(type: string, data: any, selector?: any, id?: string): DbType {
    // @ts-ignore
    if (selector && this.db.get(type).find(selector).value())
      throw new AlreadyExists(`Item already exists in '${type}' collection: ${JSON.stringify(selector)}`)
    const cleanData = removeBlankAttributes({ ...data, ...selector })
    const ret = this.populateItem(type, cleanData, selector, id)
    this.setDirty()
    return ret
  }

  deleteItem(type: string, selector: any): void {
    this.getItemReference(type, selector)
    // @ts-ignore
    this.db.get(type).remove(selector).write()
    this.setDirty()
  }

  updateItem(type: string, data: any, selector: any, merge = false): DbType {
    const prev = this.getItemReference(type, selector)
    const col = this.db.get(type)
    // @ts-ignore
    const idx = col.findIndex(selector).value()
    const merged = merge && prev ? mergeData(prev, data) : data
    const newData = removeBlankAttributes({ ...merged, ...selector })
    col.value().splice(idx, 1, newData)
    this.setDirty()
    return newData
  }

  async setDirty(): Promise<void> {
    this.dirty = !!this.editor
    const io = await getIo()
    io.emit('db', { state: this.dirty ? 'dirty' : 'clean', editor: this.editor })
  }

  isDirty(): boolean {
    return !!this.dirty
  }
}
