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
    const data = this.db.get(name).find(selectors).value()
    if (data === undefined) {
      throw new err.NotExistError('Selector props do not exist on collection: ', selectors)
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
      return this.db.get(name).push(data).last().assign(selectors).write()
    }
    throw new err.AlreadyExists(`Item already exists in ${name} collection: `, selectors)
  }

  deleteItem(name, selectors) {
    this.getItem(name, selectors)
    return this.db.get(name).remove(selectors).write()
  }

  updateItem(name, selectors, data) {
    this.getItem(name, selectors)
    return this.db.get(name).find(selectors).assign(data).write()
  }
}

function init(path) {
  return new Db(path)
}

module.exports = {
  Db: Db,
  init: init,
}
