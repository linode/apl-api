import { expect } from 'chai'
import request from 'supertest'
import sinon from 'sinon'
import initApp from './server'
import OtomiStack from './otomi-stack'
import { isAuthorized } from './middleware'
import { validateEnv } from './utils'

describe('Api tests for admin', function () {
  let app
  beforeEach(function (done) {
    const otomiStack = new OtomiStack()
    sinon.stub(otomiStack)
    app = initApp(otomiStack)
    done()
  })

  it('admin can get all teams', function (done) {
    // 'Missing request authorization mechanism'
    this.skip()
    request(app)
      .get('/v1/teams')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'admin')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('admin can get a given team', function (done) {
    request(app)
      .get('/v1/teams/team1')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'admin')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('admin can create a team', function (done) {
    const data = { name: 'Team100', clusters: ['aws/dev'], password: 'test' }
    request(app)
      .post('/v1/teams')
      .send(data)
      .set('Accept', 'application/json')
      .set('Auth-Group', 'admin')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('admin cannot delete all teams', function (done) {
    request(app).delete('/v1/teams').set('Accept', 'application/json').set('Auth-Group', 'admin').expect(404).end(done)
  })
})

describe('Api tests for team', function () {
  let app
  beforeEach(function () {
    const otomiStack = new OtomiStack()
    sinon.stub(otomiStack)
    app = initApp(otomiStack)
  })

  it('team cannot get all teams', function (done) {
    // this.skip('Missing request authorization mechanism')
    this.skip()
    request(app)
      .get('/v1/teams')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(403)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team cannot delete all teams', function (done) {
    // this.skip('Missing request authorization mechanism')
    this.skip()
    request(app).delete('/v1/teams').set('Accept', 'application/json').set('Auth-Group', 'team1').expect(404).end(done)
  })
  it('team cannot create a new team', function (done) {
    // this.skip('Missing request authorization mechanism')
    this.skip()
    request(app)
      .get('/v1/teams')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(403)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('team cannot get all teams', function (done) {
    // this.skip('Missing request authorization mechanism')
    this.skip()
    request(app)
      .get('/v1/teams')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(403)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team cannot get the other team', function (done) {
    // this.skip('Missing request authorization mechanism')
    this.skip()
    request(app)
      .get('/v1/teams/team2')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(403)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can get its team data', function (done) {
    request(app)
      .get('/v1/teams/team1')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can get its services', function (done) {
    request(app)
      .get('/v1/teams/team1/services')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can get a specific service', function (done) {
    request(app)
      .get('/v1/teams/team1/services/service1?clusterId=aws/dev')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('team can delete its service', function (done) {
    request(app)
      .delete('/v1/teams/team1/services/service1?clusterId="aws/dev')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('team can not update service from other team', function (done) {
    // this.skip('Missing request authorization mechanism')
    this.skip()
    request(app)
      .put('/v1/teams/team2/services/service1?clusterId=aws/dev', {})
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(403)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('team can not delete service from other team', function (done) {
    // this.skip('Missing request authorization mechanism')
    this.skip()
    request(app)
      .delete('/v1/teams/team2/services/service1?clusterId=aws/dev')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(403)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('team can not update service from other team', function (done) {
    // this.skip('Missing request authorization mechanism')
    this.skip()
    request(app)
      .put('/v1/teams/team2/services/service1?clusterId=aws/dev', {})
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(403)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can not get service from other team', function (done) {
    // this.skip('Missing request authorization mechanism')
    this.skip()
    request(app)
      .put('/v1/teams/team2/services/service1?clusterId=aws/dev', {})
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(403)
      .expect('Content-Type', /json/)
      .end(done)
  })
})

describe('Api tests for non authorized user', function () {
  let app
  beforeEach(function () {
    const otomiStack = new OtomiStack()
    sinon.stub(otomiStack)
    app = initApp(otomiStack)
  })
  it('should get app readiness', function (done) {
    request(app)
      .get('/v1/readiness')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('should get api spec', function (done) {
    request(app)
      .get('/v1/apiDocs')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot get a specific team', function (done) {
    request(app)
      .get('/v1/teams/team1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot modify a team', function (done) {
    request(app)
      .put('/v1/teams/team1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot delete a team', function (done) {
    request(app)
      .delete('/v1/teams/team1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot create a team', function (done) {
    request(app)
      .post('/v1/teams')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot get services', function (done) {
    request(app)
      .get('/v1/teams/team1/services')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot get a given service', function (done) {
    request(app)
      .get('/v1/teams/team1/services/service1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('cannot edit a given service', function (done) {
    request(app)
      .put('/v1/teams/team1/services/service1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot delete a given service', function (done) {
    request(app)
      .delete('/v1/teams/team1/services/service1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot add a new service', function (done) {
    request(app)
      .post('/v1/teams/team1/services')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
})

describe('Api tests for data validation', function () {
  let app
  beforeEach(function () {
    const otomiStack = new OtomiStack('tpath', 'tcloud')
    sinon.stub(otomiStack)
    app = initApp(otomiStack)
  })
  it('invalid team name data', function (done) {
    request(app)
      .post('/v1/teams')
      .send({ name: 'test_1', password: 'pass' })
      .set('Auth-Group', 'admin')
      .set('Accept', 'application/json')
      .expect(400)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('invalid slackUrl  data', function (done) {
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
  params: { teamId },
})

describe('Authorization tests', function () {
  it('should not authorize', function (done) {
    // this.skip('Missing request authorization mechanism')
    this.skip()
    const req = mockRequest('team1', 'team2')
    expect(() => isAuthorized(req, null, null)).to.throw()
    done()
  })
  it('skipped not authenticated - missing header', function (done) {
    this.skip('Missing request authorization mechanism')
    const req = mockRequest('undefined', 'team2')
    expect(() => isAuthorized(req, null, null)).to.be.throw()
    done()
  })
  it('not authorized - missing teamId in uri path', function (done) {
    this.skip('Missing request authorization mechanism')
    const req = mockRequest('team2', 'undefined')
    expect(() => isAuthorized(req, null, null)).to.throw()
    done()
  })
  it('team authorized', function (done) {
    const req = mockRequest('team2', 'team2')
    expect(isAuthorized(req, null, null)).to.be.true
    done()
  })
  it('admin authorized', function (done) {
    const req = mockRequest('admin', 'team2')
    expect(isAuthorized(req, null, null)).to.be.true
    done()
  })
  it('admin authorized 2', function (done) {
    const req = mockRequest('admin', undefined)
    expect(isAuthorized(req, null, null)).to.be.true
    done()
  })
})

describe('Config validation tests', function () {
  it('missing env variables', function (done) {
    expect(() => validateEnv({})).to.throw()
    done()
  })

  it('valid env variables', function (done) {
    const envs = {
      GIT_LOCAL_PATH: null,
      GIT_REPO_URL: null,
      GIT_USER: null,
      GIT_PASSWORD: null,
      GIT_EMAIL: null,
      GIT_BRANCH: null,
    }
    expect(() => validateEnv(envs)).to.not.throw()
    done()
  })
})
