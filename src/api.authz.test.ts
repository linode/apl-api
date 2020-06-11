import { expect } from 'chai'
import request from 'supertest'
import sinon from 'sinon'
import initApp from './server'
import OtomiStack from './otomi-stack'
import { validateEnv } from './utils'

async function validateIfUserCanGet(app, path: string, group: string) {
  await request(app)
    .get(path)
    .set('Accept', 'application/json')
    .set('Auth-Group', group)
    .expect(200)
    .expect('Content-Type', /json/)
}
describe('Api tests for admin', () => {
  let app
  before(async () => {
    const otomiStack = new OtomiStack()
    sinon.stub(otomiStack)
    app = await initApp(otomiStack)
  })

  it('admin can get global charts settings', async () => {
    await validateIfUserCanGet(app, '/v1/settings/charts/global', 'admin')
  })

  it('admin can get global cluster settings', async () => {
    await validateIfUserCanGet(app, '/v1/settings/cluster/global', 'admin')
  })

  it('admin can get global ingress settings', async () => {
    await validateIfUserCanGet(app, '/v1/settings/ingress/global', 'admin')
  })

  it('admin can get global oidc settings', async () => {
    await validateIfUserCanGet(app, '/v1/settings/oidc/global', 'admin')
  })

  it('admin can get global sites settings', async () => {
    await validateIfUserCanGet(app, '/v1/settings/sites/global', 'admin')
  })

  it('admin can get all teams', (done) => {
    request(app)
      .get('/v1/teams')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'admin')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('admin can get a given team', (done) => {
    request(app)
      .get('/v1/teams/team1')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'admin')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('admin can create a team', (done) => {
    const data = { name: 'otomi', clusters: ['aws/dev'], password: 'test' }
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
  it('admin can deploy changes', (done) => {
    request(app)
      .get('/v1/deploy')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'admin')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('team cannot get all teams', (done) => {
    request(app)
      .get('/v1/deploy')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('team can get all teams', (done) => {
    request(app)
      .get('/v1/teams')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team cannot delete all teams', (done) => {
    request(app).delete('/v1/teams').set('Accept', 'application/json').set('Auth-Group', 'team1').expect(404).end(done)
  })
  it('team cannot create a new team', (done) => {
    request(app)
      .post('/v1/teams')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('team can get other teams', (done) => {
    request(app)
      .get('/v1/teams/team2')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(200)
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

  it('team can create its own services', (done) => {
    request(app)
      .post('/v1/teams/team1/services', {
        name: 'service1',
        clusterId: 'google/dev',
        ksvc: {
          serviceType: 'ksvcPredeployed',
          image: {},
          resources: { requests: { cpu: '50m', memory: '64Mi' }, limits: { cpu: '100m', memory: '128Mi' } },
        },
      })
      .set('Content-Type', 'application/json')
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

  it('team can update its own service', (done) => {
    request(app)
      .put('/v1/teams/team1/services/service1?clusterId=aws/dev', {
        name: 'service1',
        clusterId: 'google/dev',
        ksvc: {
          serviceType: 'ksvcPredeployed',
          image: {},
          resources: { requests: { cpu: '50m', memory: '64Mi' }, limits: { cpu: '100m', memory: '128Mi' } },
        },
      })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can delete its own service', (done) => {
    request(app)
      .delete('/v1/teams/team1/services/service1?clusterId="aws/dev')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('team can not delete service from other team', (done) => {
    request(app)
      .delete('/v1/teams/team2/services/service1?clusterId=aws/dev')
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('team can not update service from other team', (done) => {
    request(app)
      .put('/v1/teams/team2/services/service1?clusterId=aws/dev', {})
      .set('Accept', 'application/json')
      .set('Auth-Group', 'team1')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('anonymous user should get app readiness', (done) => {
    request(app)
      .get('/v1/readiness')
      .set('Accept', 'application/json')
      .expect(200)
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
    request(app)
      .get('/v1/teams/team1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('anonymous user cannot modify a team', (done) => {
    request(app)
      .put('/v1/teams/team1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('anonymous user cannot delete a team', (done) => {
    request(app)
      .delete('/v1/teams/team1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('anonymous user cannot create a team', (done) => {
    request(app)
      .post('/v1/teams')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('anonymous user cannot get services', (done) => {
    request(app)
      .get('/v1/teams/team1/services')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('anonymous user cannot get a given service', (done) => {
    request(app)
      .get('/v1/teams/team1/services/service1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })

  it('anonymous user cannot edit a given service', (done) => {
    request(app)
      .put('/v1/teams/team1/services/service1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('anonymous user cannot delete a given service', (done) => {
    request(app)
      .delete('/v1/teams/team1/services/service1')
      .set('Accept', 'application/json')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(done)
  })
  it('anonymous user cannot add a new service', (done) => {
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
  before(async () => {
    const otomiStack = new OtomiStack()
    sinon.stub(otomiStack)
    app = await initApp(otomiStack)
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
