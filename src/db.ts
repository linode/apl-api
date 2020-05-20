import lowdb from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import Memory from 'lowdb/adapters/Memory'
import findIndex from 'lodash/findIndex'

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

  getItemReference(name, selectors) {
    const data = this.db.get(name).find(selectors).value()
    if (data === undefined) {
      throw new NotExistError(`Selector props do not exist in '${name}' collection: ${JSON.stringify(selectors)}`)
    }
    return data
  }

  getCollection(name: string, selectors?: object) {
    return this.db.get(name).filter(selectors).value()
  }

  createItem(name, selectors, data) {
    try {
      this.getItemReference(name, selectors)
    } catch (e) {
      const ret = this.db.get(name).push(data).last().assign(selectors).write()
      this.dirty = this.dirtyActive
      return ret
    }
    throw new AlreadyExists(`Item already exists in '${name}' collection: ${JSON.stringify(selectors)}`)
  }

  deleteItem(name, selectors) {
    this.getItemReference(name, selectors)
    this.db.get(name).remove(selectors).write()
    this.dirty = this.dirtyActive
  }

  updateItem(name, selectors, data) {
    this.getItemReference(name, selectors)
    const ret = this.db.get(name).find(selectors).assign(data).write()
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
