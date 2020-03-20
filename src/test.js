const expect = require('chai').expect
const request = require('supertest')
const sinon = require('sinon')
const server = require('./server')
const otomi = require('./otomi-stack')
const middleware = require('./middleware')
const utils = require('./utils')

describe('Api tests for admin', function() {
  var app
  beforeEach(function() {
    const otomiStack = new otomi.OtomiStack(null, null)
    sinon.stub(otomiStack)
    app = server.initApp(otomiStack)
  })

  it('admin can get all teams', function(done) {
    request(app)
      .get('/v1/teams')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'admin')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('admin can get a given team', function(done) {
    request(app)
      .get('/v1/teams/team1')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'admin')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('admin can create a team', function(done) {
    const data = { name: 'team100', clusters: ['aws/dev'] }
    request(app)
      .post('/v1/teams')
      .send(data)
      .set('Accept', 'application/json')
      .set('Auth-Group', 'admin')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('admin cannot delete all teams', function(done) {
    request(app)
      .delete('/v1/teams')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'admin')
      .expect(404)
      .end(done)
  })
})

describe('Api tests for team', function() {
  var app
  beforeEach(function() {
    const otomiStack = new otomi.OtomiStack('tpath', 'tcloud')
    sinon.stub(otomiStack)
    app = server.initApp(otomiStack)
  })

  it('team cannot get all teams', function(done) {
    request(app)
      .get('/v1/teams')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(403)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team cannot delete all teams', function(done) {
    request(app)
      .delete('/v1/teams')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(404)
      .end(done)
  })
  it('team cannot create a new team', function(done) {
    request(app)
      .get('/v1/teams')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(403)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('team cannot get all teams', function(done) {
    request(app)
      .get('/v1/teams')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(403)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team cannot get the other team', function(done) {
    request(app)
      .get('/v1/teams/team2')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(403)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can get its team data', function(done) {
    request(app)
      .get('/v1/teams/team1')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can get its services', function(done) {
    request(app)
      .get('/v1/teams/team1/services')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can get a specific service', function(done) {
    request(app)
      .get('/v1/teams/team1/services/service1')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
})

describe('Api tests for non authorized user', function() {
  var app
  beforeEach(function() {
    const otomiStack = new otomi.OtomiStack('tpath', 'tcloud')
    sinon.stub(otomiStack)
    app = server.initApp(otomiStack)
  })
  it('should get app readiness', function(done) {
    request(app)
      .get('/v1/readiness')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('should get api spec', function(done) {
    request(app)
      .get('/v1/apiDocs')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot get a specific team', function(done) {
    request(app)
      .get('/v1/teams/team1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot modify a team', function(done) {
    request(app)
      .put('/v1/teams/team1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot delete a team', function(done) {
    request(app)
      .delete('/v1/teams/team1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot create a team', function(done) {
    request(app)
      .post('/v1/teams')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot get services', function(done) {
    request(app)
      .get('/v1/teams/team1/services')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot get a given service', function(done) {
    request(app)
      .get('/v1/teams/team1/services/service1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('cannot edit a given service', function(done) {
    request(app)
      .put('/v1/teams/team1/services/service1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot delete a given service', function(done) {
    request(app)
      .delete('/v1/teams/team1/services/service1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot add a new service', function(done) {
    request(app)
      .post('/v1/teams/team1/services')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
})

describe('Api tests for data validation', function() {
  var app
  beforeEach(function() {
    const otomiStack = new otomi.OtomiStack('tpath', 'tcloud')
    sinon.stub(otomiStack)
    app = server.initApp(otomiStack)
  })
  it('invalid team name data', function(done) {
    request(app)
      .post('/v1/teams')
      .send({ name: 'test_1', password: 'pass' })
      .set('Auth-Group', 'admin')
      .set('Accept', 'application/json')
      .expect(400)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('invalid slackUrl  data', function(done) {
    request(app)
      .post('/v1/teams')
      .send({ name: 'test_1', password: 'pass', slackUrl: 'aaa.lll' })
      .set('Auth-Group', 'admin')
      .set('Accept', 'application/json')
      .expect(400)
      .expect('Content-Type', /json/)
      .end(done)
  })
})

const mockRequest = (authGroup, teamId) => ({
  header(name) {
    if (name === 'Auth-Group') return authGroup
    return null
  },
  params: { teamId: teamId },
})

describe('Authorization tests', function() {
  it('should not authorize', function(done) {
    const req = mockRequest('team1', 'team2')
    expect(() => middleware.isAuthorized(req, null, null)).to.throw()
    done()
  })
  it('not authenticated - missing header', function(done) {
    const req = mockRequest('undefined', 'team2')
    expect(() => middleware.isAuthorized(req, null, null)).to.be.throw()
    done()
  })
  it('not authorized - missing teamId in uri path', function(done) {
    const req = mockRequest('team2', 'undefined')
    expect(() => middleware.isAuthorized(req, null, null)).to.throw()
    done()
  })
  it('team authorized', function(done) {
    const req = mockRequest('team2', 'team2')
    expect(middleware.isAuthorized(req, null, null)).to.be.true
    done()
  })
  it('admin authorized', function(done) {
    const req = mockRequest('admin', 'team2')
    expect(middleware.isAuthorized(req, null, null)).to.be.true
    done()
  })
  it('admin authorized 2', function(done) {
    const req = mockRequest('admin', undefined)
    expect(middleware.isAuthorized(req, null, null)).to.be.true
    done()
  })
})

describe('Config validation tests', function() {
  it('missing env variables', function(done) {
    expect(() => utils.validateEnv({})).to.throw()
    done()
  })

  it('valid env variables', function(done) {
    const envs = {
      GIT_LOCAL_PATH: null,
      GIT_REPO_URL: null,
      GIT_USER: null,
      GIT_PASSWORD: null,
      GIT_EMAIL: null,
      GIT_BRANCH: null,
    }
    expect(() => utils.validateEnv(envs)).to.not.throw()
    done()
  })
})
