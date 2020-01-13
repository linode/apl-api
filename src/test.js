const expect = require('chai').expect;
const request = require('supertest');
const sinon = require("sinon");
const server = require('./server');
const otomi = require('./otomi-stack')
const middleware = require('./middleware')
const utils = require('./utils')

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
      .set('Auth-Group', 'admin')
      .expect('Content-Type', /json/)
      .expect(
        200,
        // {name: "team1"},
      ).end(done);
  });
  it("should answer for readiness check", function (done) {
    const otomiStack = new otomi.OtomiStack('tpath', "tcloud")
    const app = server.initApp(otomiStack)
    request(app)
      .get('/v1/readiness')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(
        200,
      ).end(done);
  });
  it("should provide api spec", function (done) {
    const otomiStack = new otomi.OtomiStack('tpath', "tcloud")
    const app = server.initApp(otomiStack)
    request(app)
      .get('/v1/apiDocs')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(
        200,
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
    expect(() => middleware.isAuthorized(req, null, null)).to.throw();
    done()
  })
  it("not authenticated - missing header", function (done) {
    const req = mockRequest('undefined', 'team2')
    expect(() => middleware.isAuthorized(req, null, null)).to.be.throw();
    done()
  })
  it("not authorized - missing teamId in uri path", function (done) {
    const req = mockRequest('team2', 'undefined')
    expect(() => middleware.isAuthorized(req, null, null)).to.throw();
    done()
  })
  it("team authorized", function (done) {
    const req = mockRequest('team2', 'team2')
    expect(middleware.isAuthorized(req, null, null)).to.be.true;
    done()
  })
  it("admin authorized", function (done) {
    const req = mockRequest('admin', 'team2')
    expect(middleware.isAuthorized(req, null, null)).to.be.true;
    done()
  })
  it("admin authorized 2", function (done) {
    const req = mockRequest('admin', undefined)
    expect(middleware.isAuthorized(req, null, null)).to.be.true;
    done()
  })
});



describe("Config validation", function () {
  it("missing env variables", function (done) {
    expect(() => utils.validateEnv({})).to.throw();
    done()
  })

  it("valid env variables", function (done) {
    const envs = {
      OTOMI_STACK_PATH: null,
      KUBE_CONTEXT: null,
      DEPLOYMENT_STAGE: null,
    }
    expect(() => utils.validateEnv(envs)).to.not.throw();
    done()
  })

});
