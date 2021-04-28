import request from 'supertest'
import sinon from 'sinon'
import { Express } from 'express'
import initApp from './server'
import OtomiStack from './otomi-stack'
import getToken from './fixtures/jwt'
import { AlreadyExists } from './error'

const adminToken: string = getToken(['team-admin'])
const teamToken: string = getToken(['team-team1'])

describe('Admin API tests', () => {
  let app
  before(async () => {
    const otomiStack = new OtomiStack()
    sinon.stub(otomiStack)
    app = await initApp(otomiStack)
  })
  it('admin can get all settings', (done) => {
    request(app)
      .get('/v1/settings')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .end(done)
  })
  it('admin can put with payload that matches the schema', (done) => {
    request(app)
      .put('/v1/settings')
      .send({
        alerts: {
          drone: 'msteams',
        },
      })
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('admin can put with empty body (empty object is valid JSON Schema 7)', (done) => {
    request(app)
      .put('/v1/settings')
      .send({})
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it(`admin can't put with keys that don't match settings object`, (done) => {
    request(app)
      .put('/v1/settings')
      .send({ foo: 'bar' })
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('admin can get all teams', (done) => {
    request(app)
      .get('/v1/teams')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('admin can get a given team', (done) => {
    request(app)
      .get('/v1/teams/team1')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('admin can create a team', (done) => {
    const data = { name: 'otomi', password: 'test' }
    request(app)
      .post('/v1/teams')
      .send(data)
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .end(done)
  })
  it('admin cannot delete all teams', (done) => {
    request(app)
      .delete('/v1/teams')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404)
      .end(done)
  })
  it('admin can deploy changes', (done) => {
    request(app)
      .get('/v1/deploy')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('team cannot get all teams', (done) => {
    request(app)
      .get('/v1/deploy')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('team can get all teams', (done) => {
    request(app)
      .get('/v1/teams')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team cannot delete all teams', (done) => {
    request(app)
      .delete('/v1/teams')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(404)
      .end(done)
  })
  it('team cannot create a new team', (done) => {
    request(app)
      .post('/v1/teams')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(401)
      .end(done)
  })

  it('team can get other teams', (done) => {
    request(app)
      .get('/v1/teams/team2')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can get its team data', (done) => {
    request(app)
      .get('/v1/teams/team1')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('team can create its own services', (done) => {
    request(app)
      .post('/v1/teams/team1/services')
      .send({
        name: 'service1',
        ksvc: {
          serviceType: 'ksvcPredeployed',
          image: {},
          resources: { requests: { cpu: '50m', memory: '64Mi' }, limits: { cpu: '100m', memory: '128Mi' } },
        },
      })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can get its services', (done) => {
    request(app)
      .get('/v1/teams/team1/services')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can get a specific service', (done) => {
    request(app)
      .get('/v1/teams/team1/services/service1')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('team can update its own service', (done) => {
    request(app)
      .put('/v1/teams/team1/services/service1')
      .send({
        name: 'service1',
        ksvc: {
          serviceType: 'ksvcPredeployed',
          image: {},
          resources: { requests: { cpu: '50m', memory: '64Mi' }, limits: { cpu: '100m', memory: '128Mi' } },
        },
      })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can delete its own service', (done) => {
    request(app)
      .delete('/v1/teams/team1/services/service')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('team can not delete service from other team', (done) => {
    request(app)
      .delete('/v1/teams/team2/services/service1')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(401)
      .end(done)
  })
  it('team can not update service from other team', (done) => {
    request(app)
      .put('/v1/teams/team2/services/service1')
      .send({})
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(401)
      .end(done)
  })
  it('anonymous user should get api spec', (done) => {
    request(app)
      .get('/v1/apiDocs')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('anonymous user cannot get a specific team', (done) => {
    request(app).get('/v1/teams/team1').set('Accept', 'application/json').expect(401).end(done)
  })
  it('anonymous user cannot modify a team', (done) => {
    request(app).put('/v1/teams/team1').set('Accept', 'application/json').expect(401).end(done)
  })
  it('anonymous user cannot delete a team', (done) => {
    request(app).delete('/v1/teams/team1').set('Accept', 'application/json').expect(401).end(done)
  })
  it('anonymous user cannot create a team', (done) => {
    request(app).post('/v1/teams').set('Accept', 'application/json').expect(401).end(done)
  })
  it('anonymous user cannot get services', (done) => {
    request(app).get('/v1/teams/team1/services').set('Accept', 'application/json').expect(401).end(done)
  })
  it('anonymous user cannot get a given service', (done) => {
    request(app).get('/v1/teams/team1/services/service1').set('Accept', 'application/json').expect(401).end(done)
  })

  it('anonymous user cannot edit a given service', (done) => {
    request(app).put('/v1/teams/team1/services/service1').set('Accept', 'application/json').expect(401).end(done)
  })
  it('anonymous user cannot delete a given service', (done) => {
    request(app).delete('/v1/teams/team1/services/service1').set('Accept', 'application/json').expect(401).end(done)
  })
  it('anonymous user cannot add a new service', (done) => {
    request(app).post('/v1/teams/team1/services').set('Accept', 'application/json').expect(401).end(done)
  })
})

describe('Api tests for data validation', () => {
  let app
  before(async () => {
    const otomiStack = new OtomiStack()
    sinon.stub(otomiStack)
    app = await initApp(otomiStack)
  })
  it('invalid team name data', (done) => {
    request(app)
      .post('/v1/teams')
      .send({ name: 'test_1', password: 'pass' })
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Accept', 'application/json')
      .expect(400)
      .end(done)
  })
  it('invalid slackUrl  data', (done) => {
    request(app)
      .post('/v1/teams')
      .send({ name: 'test_1', password: 'pass', slackUrl: 'aaa.lll' })
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Accept', 'application/json')
      .expect(400)
      .end(done)
  })
})

describe('Error handler', () => {
  let app: Express
  let otomiStack: OtomiStack
  before(async () => {
    otomiStack = new OtomiStack()
    app = await initApp(otomiStack)
  })
  it('should handle exception and transform it to HTTP response with a proper error code', (done) => {
    sinon.stub(otomiStack, 'createTeam').callsFake(() => {
      throw new AlreadyExists('exp')
    })

    const data = { name: 'otomi', password: 'test' }
    request(app)
      .post('/v1/teams')
      .send(data)
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409)
      .end(done)
  })
})
