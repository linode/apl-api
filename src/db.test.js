const expect = require('chai').expect;
const sinon = require("sinon");
const db = require('./db');


describe("Db", function () {
  var testDb;
  beforeEach(function () {
    testDb = new db.Db(null)
  })

  it("can store ", function (done) {
    const v = testDb.createItem('teams', {teamId: "n1"}, {name: "n1", k: "1"})
    expect(v).to.deep.equal({name: "n1", teamId: "n1", k: "1"});
    done()
  })
  
  it("cannot store resource with duplicated name", function (done) {
    testDb.createItem('teams', {}, {name: "n1"})

    expect(() => testDb.createItem('teams', {}, {name: "n1"})).to.throw();
    done()
  })

  it("can store relationships", function (done) {
    const v = testDb.createItem('services', {teamId: "t1", serviceId: "n1"}, {name: "n1", k: "1"})
    expect(v).to.deep.equal({name: "n1", teamId: "t1", serviceId: "n1", k: "1"});
    done()
  })

  it("can remove item", function (done) {
    testDb.createItem('teams', {teamId: "n1"}, {name: "n1", k: "1"})
    testDb.createItem('teams', {teamId: "n2"}, {name: "n2", k: "1"})

    testDb.deleteItem('teams', {teamId: "n1"})
    let v = testDb.getItem('teams', {teamId: "n1"})

    expect(v).to.be.undefined;
  
    v = testDb.getItem('teams', {teamId: "n2"})
    expect(v).to.not.be.undefined;
    done()
  })

  it("can update item", function (done) {
    testDb.createItem('teams', {teamId: "n1"}, {name: "n1", k: "1"})
    testDb.updateItem('teams', {teamId: "n1"}, {name: "n1", k: "2"})
  
    const v = testDb.getItem('teams', {teamId: "n1"})
    expect(v).to.deep.equal({name: "n1", k: "2", teamId: "n1"});
    done()
  })

  it("can obtain collection", function (done) {
    testDb.createItem('teams', {teamId: "n1"}, {name: "n1", k: "1"})
    testDb.createItem('teams', {teamId: "n2"}, {name: "n2", k: "1"})
    const v = testDb.getCollection('teams', {})
    expect(v).to.have.lengthOf(2);
    done()
  })

  it("can obtain service from a given team", function (done) {
    testDb.createItem('teams', {teamId: "t1"}, {name: "t1", t: "1"})
    testDb.createItem('services', {teamId: "t1", serviceId: "s1" }, {name: "s1", s: "1"})

    const v = testDb.getItem('services', {teamId: "t1", serviceId: "s1" })
    expect(v).to.deep.equal({teamId: "t1", serviceId: "s1", name: "s1", s: "1"});
    done()
  })

  it("can obtain services from a given team", function (done) {
    testDb.createItem('teams', {teamId: "t1"}, {name: "t1", t: "1"})
    testDb.createItem('teams', {teamId: "t2"}, {name: "t2", t: "2"})
    testDb.createItem('services', {teamId: "t1", serviceId: "s1"}, {name: "s1", s: "1"})
    testDb.createItem('services', {teamId: "t2", serviceId: "s1"}, {name: "s2", s: "2"})
    testDb.createItem('services', {teamId: "t2", serviceId: "s2"}, {name: "s1", s: "1"})

    const v = testDb.getCollection('services', {teamId: "t2"})
    expect(v).to.have.lengthOf(2);
    done()
  })

});
