const low = require('lowdb')
const err = require('./error')
const FileSync = require('lowdb/adapters/FileSync')
const Memory = require('lowdb/adapters/Memory')

class Db {
  constructor(path) {
    this.db = low(
      path == null
        ? new Memory()
        : new FileSync(path)
    )
    // Set some defaults (required if your JSON file is empty)
    this.db.defaults({ teams: [], services: [], defaultServices: []}).write()
  }

  getItem(name, uri_ids) {
    console.log(uri_ids)
    const data = this.db.get(name).find(uri_ids).value()
    if (data === undefined)
      throw new err.NotExistError("Item does not exists")
    console.log(data)
    return data
  }

  getCollection(name, uri_ids) {
    const data = this.db.get(name).filter(uri_ids).value()
    return data
  }

  createItem(name, uri_ids, data){
    const values = this.db.get(name).filter(uri_ids).value()
    if(values.length > 0)
      throw new err.AlreadyExists('Already exist');

    const value = this.db.get(name)
      .push(data)
      .last()
      .assign(uri_ids)
      .write()
    return value
  }

  deleteItem(name, uri_ids){
    const v = this.db.get(name)
      .remove(uri_ids)
      .write()
    console.log(v)
  }

  updateItem(name, uri_ids, data){
    const v = this.db.get(name)
      .find(uri_ids)
      .assign(data)
      .write()
    return v
  }
}

function init(path){
  return new Db(path)
}

module.exports = {
  Db: Db,
  init: init
};