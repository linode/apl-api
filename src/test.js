const expect = require('chai').expect;
const request = require('supertest');
const sinon = require("sinon");
const server = require('./server');
const otomi = require('./otomi-stack')
const middleware = require('./middleware')

describe("Teams", function () {
  it("should return teams", function (done) {
    const otomiStack = new otomi.OtomiStack('tpath', "tcloud")
    var stub = sinon.stub(otomiStack.dataProvider, "readYaml");
    stub.returns({ name: "team1" })

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


const mockRequest = (authGroup, teamId) => ({
  header(name) {
    if (name === 'Auth-Group') return authGroup
    return null
  },
  params: { teamId: teamId },
});

describe("Authorization", function () {
  it("should not authorize", function (done) {
    const req = mockRequest('team1', 'team2')
    expect(middleware.isAuthorized(req, null, null)).to.be.false;
    done()
  })
  it("should not authorize", function (done) {
    const req = mockRequest('undefined', 'team2')
    expect(middleware.isAuthorized(req, null, null)).to.be.false;
    done()
  })
  it("should not authorize", function (done) {
    const req = mockRequest('team2', 'undefined')
    expect(middleware.isAuthorized(req, null, null)).to.be.false;
    done()
  })
  it("should authorize", function (done) {
    const req = mockRequest('team2', 'team2')
    expect(middleware.isAuthorized(req, null, null)).to.be.true;
    done()
  })
});
