// const expect = require('chai').expect;
const request = require('supertest');
const sinon = require("sinon");
const server = require('./server');
const otomi = require('./otomi-stack')

describe("Teams", function() {
  it("should return teams", function(done) {    
    const otomiStack = new otomi.OtomiStack('tpath', "tcloud")
    var stub = sinon.stub(otomiStack.dataProvider, "readYaml");
    stub.returns({name: "team1"})

    // expect(otomiStack.dataProvider.readYaml("")).to.equal("sample body")
    const app = server.initApp(otomiStack)
    request(app)
      .get('/v1/teams')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(
        200,
        // {name: "team1"},
      ).end(done);
  });
});
