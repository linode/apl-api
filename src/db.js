const low = require('lowdb')
const err = require('./error')
const FileSync = require('lowdb/adapters/FileSync')
const Memory = require('lowdb/adapters/Memory')
const _ = require('lodash')

class Db {
  constructor(path) {
    this.db = low(path == null ? new Memory() : new FileSync(path))
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
    const data = this.db.get(name).find(selectors).value()
    if (data === undefined) {
      throw new err.NotExistError(`Selector props do not exist in '${name}' collection: ${JSON.stringify(selectors)}`)
    }
    return data
  }

  getCollection(name, selectors) {
    return this.db.get(name).filter(selectors).value()
  }

  createItem(name, selectors, data) {
    try {
      this.getItem(name, selectors)
    } catch (e) {
      const ret = this.db.get(name).push(data).last().assign(selectors).write()
      this.dirty = this.dirtyActive
      return ret
    }
    throw new err.AlreadyExists(`Item already exists in '${name}' collection: ${JSON.stringify(selectors)}`)
  }

  deleteItem(name, selectors) {
    this.getItem(name, selectors)
    this.db.get(name).remove(selectors).write()
    this.dirty = this.dirtyActive
  }

  updateItem(name, selectors, data) {
    this.getItem(name, selectors)
    const getter = this.db.get(name).find(selectors)
    const value = getter.value()
    const emptied = _.reduce(
      value,
      (memo, val, key) => {
        if (!(key in selectors)) memo[key] = undefined
        return memo
      },
      {},
    )
    const ret = getter.assign({ ...emptied, ...data }).write()
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

function init(path) {
  return new Db(path)
}

module.exports = {
  Db,
  init,
}
