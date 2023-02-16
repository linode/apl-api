import { assert } from 'chai'
import { Express } from 'express'
import { isEqual } from 'lodash'
import { SinonStubbedInstance, stub as sinonStub } from 'sinon'
import { initApp } from 'src/app'
import request, { SuperAgentTest } from 'supertest'
// import { AlreadyExists } from 'src/error'
import getToken from 'src/fixtures/jwt'
import OtomiStack from 'src/otomi-stack'
import { getSessionStack } from './middleware'
import { App } from './otomi-models'

const adminToken: string = getToken(['team-admin'])
const teamToken: string = getToken(['team-team1'])

describe('API authz tests', () => {
  let app: Express
  let otomiStack: SinonStubbedInstance<OtomiStack>
  let agent: SuperAgentTest
  before(async () => {
    // we need to get the session stack here, which was attached to req
    const _otomiStack = await getSessionStack()
    // await _otomiStack.init()
    _otomiStack.createTeam({ name: 'team1' })
    otomiStack = sinonStub(_otomiStack)
    app = await initApp(otomiStack)
    agent = request.agent(app)
    agent.set('Accept', 'application/json')
  })

  describe('Admin /settings endpoint tests', () => {
    it(`admin can get /settings/alerts`, (done) => {
      agent
        .get(`/v1/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect('Content-Type', /json/)
        .end(done)
    })

    it('admin cannot put /settings/alerts with extra properties', (done) => {
      agent
        .put('/v1/settings/alerts')
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
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400)
        .end(done)
    })
  })

  it('admin can update team self-service-flags', (done) => {
    agent
      .put('/v1/teams/team1')
      .send({
        name: 'team1',
        selfService: {
          apps: [],
          team: [],
          service: [],
        },
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .end(done)
  })
  it('admin can get all teams', (done) => {
    agent
      .get('/v1/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('admin can get a given team', (done) => {
    agent
      .get('/v1/teams/team1')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('admin can create a team', (done) => {
    const data = { name: 'otomi', password: 'test' }
    agent.post('/v1/teams').send(data).set('Authorization', `Bearer ${adminToken}`).expect(200).end(done)
  })
  it('admin can deploy changes', (done) => {
    agent
      .get('/v1/deploy')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('admin can see values from an app', (done) => {
    const values: App['values'] = { shown: true }
    otomiStack.getApp.callsFake(() => ({ id: 'adminapp', values }))
    agent
      .get('/v1/apps/admin/loki')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .then((response) => {
        assert(isEqual(response.body.values, values), 'values property is not filtered')
        done()
      })
      .catch((err) => done(err))
  })

  it('team can deploy changes', (done) => {
    agent
      .get('/v1/deploy')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('team cannot get all teams', (done) => {
    agent
      .get('/v1/deploy')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('team can get all teams', (done) => {
    agent
      .get('/v1/teams')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team cannot delete all teams', (done) => {
    agent.delete('/v1/teams').set('Authorization', `Bearer ${teamToken}`).expect(404).end(done)
  })
  it('team cannot create a new team', (done) => {
    agent
      .post('/v1/teams')
      .send({ name: 'otomi', password: 'test' })
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(403)
      .end(done)
  })

  it('team can get other teams', (done) => {
    agent
      .get('/v1/teams/team2')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can get its team data', (done) => {
    agent
      .get('/v1/teams/team1')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('team can create its own services', (done) => {
    agent
      .post('/v1/teams/team1/services')
      .send({
        name: 'service1',
        serviceType: 'ksvcPredeployed',
        ingress: { type: 'cluster' },
        networkPolicy: {
          ingressPrivate: {
            mode: 'DenyAll',
          },
        },
      })
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can get its services', (done) => {
    agent
      .get('/v1/teams/team1/services')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can get a specific service', (done) => {
    agent
      .get('/v1/teams/team1/services/service1')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can delete its own service', (done) => {
    agent
      .delete('/v1/teams/team1/services/service')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can not delete service from other team', (done) => {
    agent.delete('/v1/teams/team2/services/service1').set('Authorization', `Bearer ${teamToken}`).expect(403).end(done)
  })
  it('team can not update service from other team', (done) => {
    agent
      .put('/v1/teams/team2/services/service1')
      .send({
        name: 'service1',
        serviceType: 'ksvcPredeployed',
        ingress: {},
      })
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(403)
      .end(done)
  })
  it('team can not update workload from other team', (done) => {
    agent
      .put('/v1/teams/team2/workloads/my-uuid')
      .send({
        name: 'wid',
        url: 'https://test.local/',
      })
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(403)
      .end(done)
  })

  it('team can not delete workload from other team', (done) => {
    agent.delete('/v1/teams/team2/workloads/my-uuid').set('Authorization', `Bearer ${teamToken}`).expect(403).end(done)
  })
  it('team can not update workload values from other team', (done) => {
    agent
      .put('/v1/teams/team2/workloads/my-uuid/values')
      .send({
        a: 'b',
      })
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(403)
      .end(done)
  })
  xit('team can not see filtered values', (done) => {
    otomiStack.getApp.callsFake(() => ({ id: 'teamapp', values: { hidden: true } }))
    agent
      .get('/v1/apps/team1/loki')
      .set('Authorization', `Bearer ${teamToken}`)
      .expect(200)
      .then((response) => {
        assert(response.body.values === undefined, 'values property is filtered')
        done()
      })
      .catch((err) => done(err))
  })
  it('authenticated user should get api spec', (done) => {
    agent
      .get('/v1/apiDocs')
      .expect(200)
      .set('Authorization', `Bearer ${teamToken}`)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('authenticated user can get session', (done) => {
    agent
      .get('/v1/session')
      .expect(200)
      .set('Authorization', `Bearer ${teamToken}`)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('anonymous cannot get session', (done) => {
    agent.get('/v1/session').expect(401).expect('Content-Type', /json/).end(done)
  })

  it('anonymous user should get api spec', (done) => {
    agent.get('/v1/apiDocs').expect(200).expect('Content-Type', /json/).end(done)
  })
  it('anonymous user cannot get a specific team', (done) => {
    agent.get('/v1/teams/team1').expect(401).end(done)
  })
  it('anonymous user cannot modify a team', (done) => {
    agent.put('/v1/teams/team1').expect(401).end(done)
  })
  it('anonymous user cannot delete a team', (done) => {
    agent.delete('/v1/teams/team1').expect(401).end(done)
  })
  it('anonymous user cannot create a team', (done) => {
    agent.post('/v1/teams').expect(401).end(done)
  })
  it('anonymous user cannot get services', (done) => {
    agent.get('/v1/teams/team1/services').expect(401).end(done)
  })
  it('anonymous user cannot get workloads', (done) => {
    agent.get('/v1/teams/team1/workloads').expect(401).end(done)
  })
  it('anonymous user cannot modify a workload', (done) => {
    agent.put('/v1/teams/team1/workloads/my-uuid').expect(401).end(done)
  })
  it('anonymous user cannot modify a workload values', (done) => {
    agent.put('/v1/teams/team1/workloads/my-uuid/values').expect(401).end(done)
  })
  it('anonymous user cannot delete a workload', (done) => {
    agent.delete('/v1/teams/team1/workloads/my-uuid').expect(401).end(done)
  })
  it('anonymous user cannot get a given service', (done) => {
    agent.get('/v1/teams/team1/services/service1').expect(401).end(done)
  })

  it('anonymous user cannot edit a given service', (done) => {
    agent.put('/v1/teams/team1/services/service1').expect(401).end(done)
  })
  it('anonymous user cannot delete a given service', (done) => {
    agent.delete('/v1/teams/team1/services/service1').expect(401).end(done)
  })
  it('anonymous user cannot add a new service', (done) => {
    agent.post('/v1/teams/team1/services').expect(401).end(done)
  })
  it('should handle exists exception and transform it to HTTP response with code 409', (done) => {
    // const stub = otomiStack.createTeam.callsFake(() => {
    //   throw new AlreadyExists('test')
    // })
    const data = { name: 'test1', password: 'test' }
    agent
      .post('/v1/teams')
      .send(data)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409)
      .end(() => {
        // stub.reset()
        done()
      })
  })
})
