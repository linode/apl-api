// const expect = require('chai').expect;
const request = require('supertest');
const sinon = require("sinon");
const server = require('./server');
const otomi = require('./otomi-stack')

describe("Teams", function() {
  it("should return teams", function(done) {    
    const otomiStack = new otomi.OtomiStack('tpath', "tcloud")
    var stub = sinon.stub(otomiStack.dataProvider, "readYaml");
    stub.returns("dsadas");

    const app = server.initApp(otomiStack)
    request(app)
      .get('/v1/teams')
      .expect(
        200,
        "dasdsdassasas",
        done()
      );
  });
});
