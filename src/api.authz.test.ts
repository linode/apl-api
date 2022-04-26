import { assert } from 'chai'
import { Express } from 'express'
import { isEqual } from 'lodash'
import sinon from 'sinon'
import request from 'supertest'
import { AlreadyExists } from './error'
import getToken from './fixtures/jwt'
import OtomiStack, { loadOpenApisSpec } from './otomi-stack'
import initApp from './server'

const adminToken: string = getToken(['team-admin'])
const teamToken: string = getToken(['team-team1'])

describe('API authz tests', () => {
  let app
  let otomiStack
  before(async () => {
    otomiStack = new OtomiStack()
    const [spec] = await loadOpenApisSpec()
    otomiStack.setSpec(spec)
    otomiStack.createTeam({ name: 'team1' })
    sinon.stub(otomiStack)
    app = await initApp(otomiStack)
  })

  describe('Admin /settings endpoint tests', () => {
    it(`admin can get /settings/alerts`, (done) => {
      request(app)
        .get(`/v1/settings`)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect('Content-Type', /json/)
        .end(done)
    })

    it('admin cannot put /settings/alerts with extra properties', (done) => {
      request(app)
        .put('/v1/settings')
        .send({
          alerts: {
            drone: ['msteams'],
            groupInterval: '5m',
            msteams: {
              highPrio: 'bla',
              lowPrio: 'bla',
            },
            receivers: ['slack'],
            repeatInterval: '3h',
            randomProp: 'randomValue',
          },
        })
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400)
        .end(done)
    })

    it('admin can put empty payload, but it wont change anything', (done) => {
      request(app)
        .put('/v1/settings')
        .send({})
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .end(done)
    })
  })

  it('admin can update team self-service-flags', (done) => {
    request(app)
      .put('/v1/teams/team1')
      .send({
        name: 'team1',
        selfService: {
          app: [],
          team: [],
          service: [],
        },
      })
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
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
  it('admin can see values from an app', (done) => {
    const values = { shown: true }
    otomiStack.getApp.callsFake(() => ({ values }))
    request(app)
      .get('/v1/apps/admin/loki')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .then((response) => {
        assert(isEqual(response.body.values, values), 'values property is not filtered')
        done()
      })
      .catch((err) => done(err))
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
      .send({ name: 'otomi', password: 'test' })
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(403)
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
        serviceType: 'ksvcPredeployed',
        ingress: {},
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
          image: {},
          serviceType: 'ksvcPredeployed',
          resources: { requests: { cpu: '50m', memory: '64Mi' }, limits: { cpu: '100m', memory: '128Mi' } },
        },
        ingress: {},
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
      .expect(403)
      .end(done)
  })
  it('team can not update service from other team', (done) => {
    request(app)
      .put('/v1/teams/team2/services/service1')
      .send({
        name: 'service1',
        serviceType: 'ksvcPredeployed',
        ingress: {},
      })
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(403)
      .end(done)
  })
  it('team can not see values from an app', (done) => {
    otomiStack.getApp.callsFake(() => ({ values: { hidden: true } }))
    request(app)
      .get('/v1/apps/team1/loki')
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .then((response) => {
        assert(response.body.values === undefined, 'values property is filtered')
        done()
      })
      .catch((err) => done(err))
  })

  it('authenticated user should get api spec', (done) => {
    request(app)
      .get('/v1/apiDocs')
      .set('Accept', 'application/json')
      .expect(200)
      .set('Authorization', `Bearer ${teamToken}`)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('authenticated user can get session', (done) => {
    request(app)
      .get('/v1/session')
      .set('Accept', 'application/json')
      .expect(200)
      .set('Authorization', `Bearer ${teamToken}`)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('anonymous cannot get session', (done) => {
    request(app)
      .get('/v1/session')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
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

describe('Error handler', () => {
  let app: Express
  let otomiStack: OtomiStack
  before(async () => {
    otomiStack = new OtomiStack()
    const [spec] = await loadOpenApisSpec()
    otomiStack.setSpec(spec)
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
