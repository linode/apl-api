import { expect } from 'chai'
import request from 'supertest'
import sinon from 'sinon'
import initApp from './server'
import OtomiStack from './otomi-stack'
import { isAuthorized } from './middleware'
import { validateEnv } from './utils'

describe('Api tests for admin', () => {
  let app
  beforeEach(() => {
    const otomiStack = new OtomiStack()
    sinon.stub(otomiStack)
    app = initApp(otomiStack)
  })

  it.skip('admin can get all teams', (done) => {
    request(app)
      .get('/v1/teams')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'admin')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it.skip('admin can get a given team', (done) => {
    request(app)
      .get('/v1/teams/team1')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'admin')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it.skip('admin can create a team', (done) => {
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
  it('admin cannot delete all teams', (done) => {
    request(app).delete('/v1/teams').set('Accept', 'application/json').set('Auth-Group', 'admin').expect(404).end(done)
  })
})

describe('Api tests for team', () => {
  let app

  beforeEach(() => {
    const otomiStack = new OtomiStack()
    sinon.stub(otomiStack)
    app = initApp(otomiStack)
  })

  it.skip('team cannot get all teams', (done) => {
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
  it.skip('team cannot delete all teams', (done) => {
    // this.skip('Missing request authorization mechanism')
    this.skip()
    request(app).delete('/v1/teams').set('Accept', 'application/json').set('Auth-Group', 'team1').expect(404).end(done)
  })
  it.skip('team cannot create a new team', (done) => {
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

  it.skip('team cannot get all teams', (done) => {
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
  it.skip('team cannot get the other team', (done) => {
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
  it('team can get its team data', (done) => {
    request(app)
      .get('/v1/teams/team1')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can get its services', (done) => {
    request(app)
      .get('/v1/teams/team1/services')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can get a specific service', (done) => {
    request(app)
      .get('/v1/teams/team1/services/service1?clusterId=aws/dev')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('team can delete its service', (done) => {
    request(app)
      .delete('/v1/teams/team1/services/service1?clusterId="aws/dev')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it.skip('team can not update service from other team', (done) => {
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

  it.skip('team can not delete service from other team', (done) => {
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

  it.skip('team can not update service from other team', (done) => {
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
  it.skip('team can not get service from other team', (done) => {
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

describe('Api tests for non authorized user', () => {
  let app
  beforeEach(() => {
    const otomiStack = new OtomiStack()
    sinon.stub(otomiStack)
    app = initApp(otomiStack)
  })
  it('should get app readiness', (done) => {
    request(app)
      .get('/v1/readiness')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('should get api spec', (done) => {
    request(app)
      .get('/v1/apiDocs')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot get a specific team', (done) => {
    request(app)
      .get('/v1/teams/team1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot modify a team', (done) => {
    request(app)
      .put('/v1/teams/team1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot delete a team', (done) => {
    request(app)
      .delete('/v1/teams/team1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot create a team', (done) => {
    request(app)
      .post('/v1/teams')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot get services', (done) => {
    request(app)
      .get('/v1/teams/team1/services')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot get a given service', (done) => {
    request(app)
      .get('/v1/teams/team1/services/service1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('cannot edit a given service', (done) => {
    request(app)
      .put('/v1/teams/team1/services/service1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot delete a given service', (done) => {
    request(app)
      .delete('/v1/teams/team1/services/service1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('cannot add a new service', (done) => {
    request(app)
      .post('/v1/teams/team1/services')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
})

describe('Api tests for data validation', () => {
  let app
  beforeEach(() => {
    const otomiStack = new OtomiStack()
    sinon.stub(otomiStack)
    app = initApp(otomiStack)
  })
  it('invalid team name data', (done) => {
    request(app)
      .post('/v1/teams')
      .send({ name: 'test_1', password: 'pass' })
      .set('Auth-Group', 'admin')
      .set('Accept', 'application/json')
      .expect(400)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('invalid slackUrl  data', (done) => {
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

describe('Authorization tests', () => {
  it.skip('should not authorize', (done) => {
    // this.skip('Missing request authorization mechanism')
    this.skip()
    const req = mockRequest('team1', 'team2')
    expect(() => isAuthorized(req)).to.throw()
    done()
  })
  it.skip('skipped not authenticated - missing header', (done) => {
    this.skip()
    const req = mockRequest('undefined', 'team2')
    expect(() => isAuthorized(req)).to.be.throw()
    done()
  })
  it.skip('not authorized - missing teamId in uri path', (done) => {
    this.skip()
    const req = mockRequest('team2', 'undefined')
    expect(() => isAuthorized(req)).to.throw()
    done()
  })
  it('team authorized', (done) => {
    const req = mockRequest('team2', 'team2')
    expect(isAuthorized(req)).to.be.true
    done()
  })
  it('admin authorized', (done) => {
    const req = mockRequest('admin', 'team2')
    expect(isAuthorized(req)).to.be.true
    done()
  })
  it('admin authorized 2', (done) => {
    const req = mockRequest('admin', undefined)
    expect(isAuthorized(req)).to.be.true
    done()
  })
})

describe('Config validation tests', () => {
  it('missing env variables', (done) => {
    expect(() => validateEnv({})).to.throw()
    done()
  })

  it('valid env variables', (done) => {
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
