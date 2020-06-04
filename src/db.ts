import lowdb from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import Memory from 'lowdb/adapters/Memory'
import findIndex from 'lodash/findIndex'
import { v4 as uuidv4 } from 'uuid'
import cloneDeep from 'lodash/cloneDeep'
import { AlreadyExists, NotExistError } from './error'

export class Db {
  // db: LowdbSync<any>
  // db: lowdb.LowdbSync<any>
  db

  dirty: boolean

  dirtyActive: boolean

  constructor(path) {
    this.db = lowdb(path == null ? new Memory('') : new FileSync(path))
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
        defaultServices: [],
        clouds: [],
        clusters: [],
      })
      .write()
    this.dirty = false
    this.dirtyActive = false
  }

  getItem(name, selectors) {
    // By default data is returned by reference, this means that modifications to returned objects may change the database.
    // To avoid such behavior, we use .cloneDeep().
    const data = this.getItemReference(name, selectors)
    return cloneDeep(data)
  }

  getItemReference(type, selectors) {
    const data = this.db.get(type).find(selectors).value()
    if (data === undefined) {
      throw new NotExistError(`Selector props do not exist in '${type}' collection: ${JSON.stringify(selectors)}`)
    }
    return data
  }

  getCollection(type: string, selectors?: object) {
    return this.db.get(type).filter(selectors).value()
  }

  populateItem(type, data, selector = undefined, id: string = undefined) {
    if (selector && this.db.get(type).find(selector).value()) return undefined
    return this.db
      .get(type)
      .push(data)
      .last()
      .assign({ id: id || uuidv4() })
      .write()
  }

  createItem(type, data, selector = undefined, id: string = undefined) {
    if (selector && this.db.get(type).find(selector).value())
      throw new AlreadyExists(`Item already exists in '${type}' collection: ${JSON.stringify(selector)}`)
    const ret = this.populateItem(type, data, id)
    this.dirty = this.dirtyActive
    return ret
  }

  deleteItem(type, selectors) {
    this.getItemReference(type, selectors)
    this.db.get(type).remove(selectors).write()
    this.dirty = this.dirtyActive
  }

  updateItem(type, selectors, data) {
    this.getItemReference(type, selectors)
    const ret = this.db.get(type).find(selectors).assign(data).write()
    this.dirty = this.dirtyActive
    return ret
  }

  setDirtyActive(active = true) {
    this.dirtyActive = active
  }

  isDirty() {
    return !!this.dirty
  }
}

export default function db(path) {
  return new Db(path)
}
