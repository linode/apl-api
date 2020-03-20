const low = require('lowdb')
const err = require('./error')
const FileSync = require('lowdb/adapters/FileSync')
const Memory = require('lowdb/adapters/Memory')

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
  }

  getItem(name, selectors) {
    console.log(selectors)
    const data = this.db
      .get(name)
      .find(selectors)
      .value()
    if (data === undefined) {
      throw new err.NotExistError(`Selector props ${JSON.stringify(selectors)} do not exist on collection`)
    }
    return data
  }

  getCollection(name, selectors) {
    const data = this.db
      .get(name)
      .filter(selectors)
      .value()
    return data
  }

  createItem(name, selectors, data) {
    const values = this.db
      .get(name)
      .filter(selectors)
      .value()
    if (values.length > 0)
      throw new err.AlreadyExists(`Item: ${JSON.stringify(selectors)} already exist in ${name} document`)

    const value = this.db
      .get(name)
      .push(data)
      .last()
      .assign(selectors)
      .write()
    return value
  }

  deleteItem(name, selectors) {
    const v = this.db
      .get(name)
      .remove(selectors)
      .write()
    // console.log(v)
    return v
  }

  updateItem(name, selectors, data) {
    const v = this.db
      .get(name)
      .find(selectors)
      .assign(data)
      .write()
    return v
  }
}

function init(path) {
  return new Db(path)
}

module.exports = {
  Db: Db,
  init: init,
}
