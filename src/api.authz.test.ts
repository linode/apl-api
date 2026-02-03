import { Express } from 'express'
import { mockDeep } from 'jest-mock-extended'
import { initApp, loadSpec } from 'src/app'
import getToken from 'src/fixtures/jwt'
import OtomiStack from 'src/otomi-stack'
import request from 'supertest'
import { HttpError } from './error'
import { Git } from './git'
import { getSessionStack } from './middleware'
import { App, CodeRepo, Netpol, SealedSecret } from './otomi-models'
import * as getValuesSchemaModule from './utils'
import TestAgent from 'supertest/lib/agent'
import { FileStore } from './fileStore/file-store'

const platformAdminToken = getToken(['platform-admin'])
const teamAdminToken = getToken(['team-admin', 'team-team1'])
const teamMemberToken = getToken(['team-team1'])
const userToken = getToken([])
const teamId = 'team1'
const otherTeamId = 'team2'

jest.mock('./k8s_operations')
jest.mock('./utils/sealedSecretUtils')
beforeAll(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'debug').mockImplementation(() => {})
  jest.spyOn(console, 'info').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})

  jest.spyOn(getValuesSchemaModule, 'getValuesSchema').mockResolvedValue({})

  await loadSpec()
})

describe('API authz tests', () => {
  let app: Express
  let otomiStack: OtomiStack
  let agent: TestAgent

  beforeAll(async () => {
    const _otomiStack = await getSessionStack()
    _otomiStack.git = mockDeep<Git>()
    _otomiStack.fileStore = new FileStore()
    otomiStack = _otomiStack as jest.Mocked<OtomiStack>

    otomiStack.saveTeam = jest.fn().mockResolvedValue(undefined)
    otomiStack.doDeleteDeployment = jest.fn().mockImplementation(() => Promise.resolve())
    otomiStack.doDeployment = jest.fn().mockImplementation(() => Promise.resolve())
    otomiStack.fileStore.set('env/teams/team1/settings.yaml', {
      kind: 'AplTeamSettingSet',
      metadata: {
        name: 'team1',
        labels: {
          'apl.io/teamId': 'team1',
        },
      },
      spec: {
        selfService: {
          teamMembers: {
            downloadKubeconfig: true,
            downloadDockerLogin: true,
            editSecurityPolicies: true,
          },
        },
      },
    })
    otomiStack.fileStore.set('env/teams/team2/settings.yaml', {
      kind: 'AplTeamSettingSet',
      metadata: {
        name: 'team2',
        labels: {
          'apl.io/teamId': 'team2',
        },
      },
      spec: {
        selfService: {
          teamMembers: {
            downloadKubeconfig: true,
            downloadDockerLogin: true,
          },
        },
      },
    })
    otomiStack.isLoaded = true
    app = await initApp(otomiStack)
    agent = request.agent(app)
    agent.set('Accept', 'application/json')
  })

  beforeEach(() => {
    jest.spyOn(otomiStack, 'createTeam').mockResolvedValue({ name: 'team', resourceQuota: [] })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Platform Admin /settings endpoint tests', () => {
    test('platform admin can get /settings/alerts', async () => {
      await agent
        .get('/v1/settings')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)
        .expect('Content-Type', /json/)
    })

    test('platform admin cannot put /settings/alerts with extra properties', async () => {
      await agent
        .put('/v1/settings/alerts')
        .send({
          alerts: {
            groupInterval: '5m',
            msteams: { highPrio: 'bla', lowPrio: 'bla' },
            receivers: ['slack'],
            repeatInterval: '3h',
            randomProp: 'randomValue',
          },
        })
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(400)
    })
  })

  test('platform admin can update team self-service-flags', async () => {
    jest.spyOn(otomiStack, 'editTeam').mockReturnValue({} as any)
    await agent
      .put('/v1/teams/team1')
      .send({
        name: 'team1',
        selfService: {
          apps: [],
          team: [],
          service: [],
        },
      })
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .expect(200)
  })

  test('platform admin can get all teams', async () => {
    await agent
      .get('/v1/teams')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
  })

  test('platform admin can get a given team', async () => {
    await agent
      .get('/v1/teams/team1')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
  })

  test('platform admin can create a team', async () => {
    const data = { name: 'otomi', password: 'test' }
    await agent.post('/v1/teams').send(data).set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
  })

  test('platform admin can get all values', async () => {
    jest.spyOn(otomiStack, 'getValues').mockResolvedValue({})
    await agent.get('/v1/otomi/values').set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
  })

  test('team member cannot get all values', async () => {
    await agent.get('/v1/otomi/values').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
  })

  test('authenticated user cannot get all values', async () => {
    await agent.get('/v1/otomi/values').set('Authorization', `Bearer ${userToken}`).expect(403)
  })

  test('unauthenticated user cannot get all values', async () => {
    await agent.get('/v1/otomi/values').expect(401)
  })

  test('platform admin can see values from an app', async () => {
    const values = { shown: true } as App['values']
    jest.spyOn(otomiStack, 'getApp').mockImplementation(() => ({ id: 'adminapp', values }))
    const response = await agent
      .get('/v1/apps/admin/loki')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .expect(200)
    expect(response.body.values).toEqual(values)
  })

  test('team member cannot get all teams', async () => {
    await agent
      .get('/v1/teams')
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(403)
      .expect('Content-Type', /json/)
  })

  test('team member cannot create a new team', async () => {
    await agent
      .post('/v1/teams')
      .send({ name: 'otomi', password: 'test' })
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(403)
  })

  test('team member cannot get other teams', async () => {
    jest.spyOn(otomiStack, 'getTeam').mockResolvedValue({} as never)
    await agent
      .get('/v1/teams/team2')
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(403)
      .expect('Content-Type', /json/)
  })

  test('team member can get its team data', async () => {
    await agent
      .get('/v1/teams/team1')
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
  })

  test('team member can create its own services', async () => {
    jest.spyOn(otomiStack, 'createService').mockResolvedValue({} as any)
    await agent
      .post('/v1/teams/team1/services')
      .send({
        name: 'newservice',
        serviceType: 'ksvcPredeployed',
        ingress: { type: 'cluster' },
        networkPolicy: {
          ingressPrivate: { mode: 'DenyAll' },
        },
      })
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
  })

  test('team member can get its services', async () => {
    await agent
      .get('/v1/teams/team1/services')
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
  })

  test('team member can get a specific service', async () => {
    jest.spyOn(otomiStack, 'getService').mockResolvedValue({} as never)
    await agent
      .get('/v1/teams/team1/services/service1')
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
  })

  test('team member can delete its own service', async () => {
    jest.spyOn(otomiStack, 'deleteService').mockResolvedValue()
    await agent
      .delete('/v1/teams/team1/services/service2')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
  })

  test('team member cannot delete service from other team', async () => {
    await agent
      .delete('/v1/teams/team2/services/service1')
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(403)
  })

  test('team member cannot update service from other team', async () => {
    await agent
      .put('/v1/teams/team2/services/service1')
      .send({
        name: 'service1',
        serviceType: 'ksvcPredeployed',
        ingress: { type: 'cluster' },
      })
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(403)
  })

  test('team member cannot update workload from other team', async () => {
    await agent
      .put('/v1/teams/team2/workloads/my-uuid')
      .send({ name: 'wid', url: 'https://test.local/' })
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(403)
  })

  test('team member cannot delete workload from other team', async () => {
    await agent
      .delete('/v1/teams/team2/workloads/my-uuid')
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(403)
  })

  test('team member cannot update workload values from other team', async () => {
    await agent
      .put('/v1/teams/team2/workloads/my-uuid/values')
      .send({ values: { a: 'b' } })
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(403)
  })

  test('team member can update workload values with payload lower than limit', async () => {
    jest.spyOn(otomiStack, 'editWorkloadValues').mockResolvedValue({} as any)

    const largePayload = { data: 'A'.repeat(400000) } // 400KB
    await agent
      .put('/v1/teams/team1/workloads/my-uuid/values')
      .send({ values: largePayload })
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(200)
  })

  test('team member cannot update workload values with payload higher than limit', async () => {
    const largePayload = { data: 'A'.repeat(600000) } // 600KB
    await agent
      .put('/v1/teams/team1/workloads/my-uuid/values')
      .send({ values: largePayload })
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(413)
  })

  test('authenticated user should get api spec', async () => {
    await agent
      .get('/v1/apiDocs')
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
  })

  test('authenticated user can get session', async () => {
    jest.spyOn(otomiStack, 'getSession').mockResolvedValue({} as any)

    await agent
      .get('/v1/session')
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
  })

  test('anonymous user cannot get session', async () => {
    await agent.get('/v1/session').expect(401).expect('Content-Type', /json/)
  })

  test('anonymous user should get api spec', async () => {
    await agent.get('/v1/apiDocs').expect(200).expect('Content-Type', /json/)
  })

  test('anonymous user cannot get a specific team', async () => {
    await agent.get('/v1/teams/team1').expect(401)
  })

  test('anonymous user cannot modify a team', async () => {
    await agent.put('/v1/teams/team1').expect(401)
  })

  test('anonymous user cannot delete a team', async () => {
    await agent.delete('/v1/teams/team1').expect(401)
  })

  test('anonymous user cannot create a team', async () => {
    await agent.post('/v1/teams').expect(401)
  })

  test('anonymous user cannot get services', async () => {
    await agent.get('/v1/teams/team1/services').expect(401)
  })

  test('anonymous user cannot get workloads', async () => {
    await agent.get('/v1/teams/team1/workloads').expect(401)
  })

  test('anonymous user cannot modify a workload', async () => {
    await agent.put('/v1/teams/team1/workloads/my-uuid').expect(401)
  })

  test('anonymous user cannot modify a workload values', async () => {
    await agent.put('/v1/teams/team1/workloads/my-uuid/values').expect(401)
  })

  test('anonymous user cannot delete a workload', async () => {
    await agent.delete('/v1/teams/team1/workloads/my-uuid').expect(401)
  })

  test('anonymous user cannot get a given service', async () => {
    await agent.get('/v1/teams/team1/services/service1').expect(401)
  })

  test('anonymous user cannot edit a given service', async () => {
    await agent.put('/v1/teams/team1/services/service1').expect(401)
  })

  test('anonymous user cannot delete a given service', async () => {
    await agent.delete('/v1/teams/team1/services/service1').expect(401)
  })

  test('anonymous user cannot create a new service', async () => {
    await agent.post('/v1/teams/team1/services').expect(401)
  })

  test('should handle exists exception and transform it to HTTP response with code 409', async () => {
    const data = { name: 'team1', password: 'test' }
    jest.spyOn(otomiStack, 'createTeam').mockRejectedValue(new HttpError(409))
    await agent.post('/v1/teams').send(data).set('Authorization', `Bearer ${platformAdminToken}`).expect(409)
  })

  test('team member can create its own sealedsecret', async () => {
    jest.spyOn(otomiStack, 'createSealedSecret').mockResolvedValue({} as SealedSecret)

    const data = {
      name: 'demo',
      encryptedData: { foo: 'encrypted-text-BAR' },
      type: 'kubernetes.io/opaque',
    }
    await agent
      .post(`/v1/teams/${teamId}/sealedsecrets`)
      .send(data)
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(200)
  })

  test('team member can read its own sealedsecret', async () => {
    jest.spyOn(otomiStack, 'getSealedSecret').mockResolvedValue({} as SealedSecret)

    await agent
      .get(`/v1/teams/${teamId}/sealedsecrets/my-uuid`)
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(200)
  })

  test('team member can update its own sealedsecret', async () => {
    jest.spyOn(otomiStack, 'editSealedSecret').mockResolvedValue({} as SealedSecret)

    const data = {
      name: 'demo',
      encryptedData: { foo: 'encrypted-text-BAZ' },
      type: 'kubernetes.io/opaque',
    }
    await agent
      .put(`/v1/teams/${teamId}/sealedsecrets/my-uuid`)
      .send(data)
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(200)
  })

  test('team member can delete its own sealedsecret', async () => {
    jest.spyOn(otomiStack, 'deleteSealedSecret').mockResolvedValue()

    await agent
      .delete(`/v1/teams/${teamId}/sealedsecrets/my-uuid`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
  })

  test('team member cannot create others sealedsecret', async () => {
    const data = {
      name: 'demo',
      encryptedData: { foo: 'encrypted-text-BAR' },
      type: 'kubernetes.io/opaque',
    }
    await agent
      .post(`/v1/teams/${otherTeamId}/sealedsecrets`)
      .send(data)
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(403)
  })

  test('team member cannot read others sealedsecret', async () => {
    await agent
      .get(`/v1/teams/${otherTeamId}/sealedsecrets/my-uuid`)
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(403)
  })

  test('team member cannot update others sealedsecret', async () => {
    const data = {
      name: 'demo',
      encryptedData: { foo: 'encrypted-text-BAZ' },
      type: 'kubernetes.io/opaque',
    }
    await agent
      .put(`/v1/teams/${otherTeamId}/sealedsecrets/my-uuid`)
      .send(data)
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(403)
  })

  test('team member cannot delete others sealedsecret', async () => {
    await agent
      .delete(`/v1/teams/${otherTeamId}/sealedsecrets/my-uuid`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(403)
      .expect('Content-Type', /json/)
  })

  test('team member can get its own sealedsecrets', async () => {
    await agent
      .get(`/v1/teams/${teamId}/sealedsecrets`)
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(200)
      .expect('Content-Type', /json/)
  })

  test('team member cannot get others sealedsecrets', async () => {
    await agent
      .get(`/v1/teams/${otherTeamId}/sealedsecrets`)
      .set('Authorization', `Bearer ${teamMemberToken}`)
      .expect(403)
  })

  test('team member cannot get all sealedsecrets', async () => {
    await agent.get('/v1/sealedsecrets').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
  })

  test('team member cannot get the sealedsecretskeys', async () => {
    await agent.get('/v1/sealedsecretskeys').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
  })

  describe('Platform Admin /users endpoint tests', () => {
    const userData = {
      email: 'user@one.com',
      firstName: 'user',
      lastName: 'one',
      teams: ['team1'],
    }

    test('platform admin can create platform admin users', async () => {
      jest.spyOn(otomiStack, 'createUser').mockResolvedValue({} as any)
      await agent
        .post('/v1/users')
        .send({ ...userData, isPlatformAdmin: true, isTeamAdmin: false })
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)
    })

    test('platform admin can create team admin users', async () => {
      jest.spyOn(otomiStack, 'createUser').mockResolvedValue({} as any)

      await agent
        .post('/v1/users')
        .send({ ...userData, isPlatformAdmin: false, isTeamAdmin: true })
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)
    })

    test('platform admin can create team member users', async () => {
      jest.spyOn(otomiStack, 'createUser').mockResolvedValue({} as any)

      await agent
        .post('/v1/users')
        .send({ ...userData, isPlatformAdmin: false, isTeamAdmin: false })
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)
    })

    test('platform admin can get all users', async () => {
      await agent.get('/v1/users').set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
    })

    test('platform admin can update users', async () => {
      jest.spyOn(otomiStack, 'editUser').mockResolvedValue({} as any)

      await agent
        .put('/v1/users/user1')
        .send({ ...userData })
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)
    })

    test('platform admin can delete users', async () => {
      jest.spyOn(otomiStack, 'deleteUser').mockResolvedValue({} as any)

      await agent
        .delete('/v1/users/user1')
        .send({ id: 'user1' })
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)
    })
  })

  describe('Team Admin /users endpoint tests', () => {
    const userData = {
      email: 'user@one.com',
      firstName: 'user',
      lastName: 'one',
      isPlatformAdmin: false,
      isTeamAdmin: false,
    }

    test('team admin cannot create users', async () => {
      await agent
        .post('/v1/users')
        .send({ ...userData })
        .set('Authorization', `Bearer ${teamAdminToken}`)
        .expect(403)
    })

    test('team admin can get all users with basic info', async () => {
      await agent.get('/v1/users').set('Authorization', `Bearer ${teamAdminToken}`).expect(200)
    })

    test('team admin can update all users teams field', async () => {
      jest.spyOn(otomiStack, 'editTeamUsers').mockResolvedValue({} as any)

      await agent
        .put(`/v1/teams/${teamId}/users`)
        .send([{ ...userData }])
        .set('Authorization', `Bearer ${teamAdminToken}`)
        .expect(200)
    })

    test('team admin cannot delete users', async () => {
      await agent
        .delete('/v1/users/user1')
        .send({ id: 'user1' })
        .set('Authorization', `Bearer ${teamAdminToken}`)
        .expect(403)
    })
  })

  describe('Team Member /users endpoint tests', () => {
    const userData = {
      email: 'user@one.com',
      firstName: 'user',
      lastName: 'one',
      isPlatformAdmin: false,
      isTeamAdmin: false,
    }

    test('team member cannot get all users', async () => {
      await agent.get('/v1/users').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
    })

    test('team member cannot get user', async () => {
      await agent.get('/v1/users/user1').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
    })

    test('team member cannot create users', async () => {
      await agent
        .post('/v1/users')
        .send({ ...userData })
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(403)
    })

    test('team member cannot update users', async () => {
      await agent
        .put('/v1/users/user1')
        .send({ ...userData })
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(403)
    })

    test('team member cannot delete users', async () => {
      await agent
        .delete('/v1/users/user1')
        .send({ id: 'user1' })
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(403)
    })
  })

  describe('Code repository endpoints tests', () => {
    const data = {
      name: 'demo',
      gitService: 'github' as 'gitea' | 'github' | 'gitlab',
      repositoryUrl: 'https://github.com/buildpacks/samples',
      private: true,
      secret: 'demo',
    }
    test('team member can create its own codeRepo', async () => {
      jest.spyOn(otomiStack, 'createCodeRepo').mockResolvedValue({} as CodeRepo)
      await agent
        .post(`/v1/teams/${teamId}/coderepos`)
        .send(data)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(200)
    })

    test('team member can read its own codeRepo', async () => {
      jest.spyOn(otomiStack, 'getCodeRepo').mockResolvedValue({} as never)
      await agent
        .get(`/v1/teams/${teamId}/coderepos/my-uuid`)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(200)
    })

    test('team member can update its own codeRepo', async () => {
      jest.spyOn(otomiStack, 'editCodeRepo').mockResolvedValue({} as CodeRepo)

      await agent
        .put(`/v1/teams/${teamId}/coderepos/my-uuid`)
        .send(data)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(200)
    })

    test('team member can delete its own codeRepo', async () => {
      jest.spyOn(otomiStack, 'deleteCodeRepo').mockResolvedValue()

      await agent
        .delete(`/v1/teams/${teamId}/coderepos/my-uuid`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(200)
        .expect('Content-Type', /json/)
    })

    test('team member cannot create others codeRepo', async () => {
      await agent
        .post(`/v1/teams/${otherTeamId}/coderepos`)
        .send(data)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(403)
    })

    test('team member cannot read others codeRepo', async () => {
      await agent
        .get(`/v1/teams/${otherTeamId}/coderepos/my-uuid`)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(403)
    })

    test('team member cannot update others codeRepo', async () => {
      await agent
        .put(`/v1/teams/${otherTeamId}/coderepos/my-uuid`)
        .send(data)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(403)
    })

    test('team member cannot delete others codeRepo', async () => {
      await agent
        .delete(`/v1/teams/${otherTeamId}/coderepos/my-uuid`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(403)
        .expect('Content-Type', /json/)
    })

    test('team member can test code repository url', async () => {
      jest.spyOn(otomiStack, 'getTestRepoConnect').mockResolvedValue({})
      await agent
        .get(`/v1/testRepoConnect`)
        .query({ url: data.repositoryUrl })
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(200)
    })

    test('team member can get internal repository urls', async () => {
      jest.spyOn(otomiStack, 'getInternalRepoUrls').mockResolvedValue([])
      await agent
        .get(`/v1/internalRepoUrls`)
        .query({ teamId })
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(200)
    })
  })

  describe('Policy endpoint tests', () => {
    const data = { action: 'Enforce', severity: 'high' }

    test('platform admin can get policies', async () => {
      await agent
        .get('/v1/teams/team1/policies')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)
        .expect('Content-Type', /json/)
    })

    test('platform admin can update policies', async () => {
      jest.spyOn(otomiStack, 'editAplPolicy').mockReturnValue({} as any)
      await agent
        .put('/v1/teams/team1/policies/disallow-selinux')
        .send(data)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)
        .expect('Content-Type', /json/)
    })

    test('team member can get policies', async () => {
      await agent
        .get('/v1/teams/team1/policies')
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(200)
        .expect('Content-Type', /json/)
    })

    test('team member can not update policies of other team', async () => {
      await agent
        .put('/v1/teams/team2/policies/disallow-selinux')
        .send(data)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(403)
        .expect('Content-Type', /json/)
    })
  })

  describe('Network policy endpoints tests', () => {
    const data = {
      name: 'demo-netpol',
      ruleType: {
        type: 'ingress',
        ingress: { mode: 'AllowAll', toLabelName: 'app', toLabelValue: 'my-app' },
      },
    }

    test('team member can create its own netpol', async () => {
      jest.spyOn(otomiStack, 'createNetpol').mockResolvedValue({} as Netpol)
      await agent
        .post(`/v1/teams/${teamId}/netpols`)
        .send(data)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(200)
    })

    test('team member can read its own netpol', async () => {
      jest.spyOn(otomiStack, 'getNetpol').mockReturnValue({} as Netpol)
      await agent
        .get(`/v1/teams/${teamId}/netpols/my-netpol`)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(200)
    })

    test('team member can update its own netpol', async () => {
      jest.spyOn(otomiStack, 'editNetpol').mockResolvedValue({} as Netpol)

      await agent
        .put(`/v1/teams/${teamId}/netpols/my-netpol`)
        .send(data)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(200)
    })

    test('team member can delete its own netpol', async () => {
      jest.spyOn(otomiStack, 'deleteNetpol').mockResolvedValue()

      await agent
        .delete(`/v1/teams/${teamId}/netpols/my-netpol`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(200)
        .expect('Content-Type', /json/)
    })

    test('team member cannot create others netpol', async () => {
      await agent
        .post(`/v1/teams/${otherTeamId}/netpols`)
        .send(data)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(403)
    })

    test('team member cannot read others netpol', async () => {
      await agent
        .get(`/v1/teams/${otherTeamId}/netpols/my-netpol`)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(403)
    })

    test('team member cannot update others netpol', async () => {
      await agent
        .put(`/v1/teams/${otherTeamId}/netpols/my-netpol`)
        .send(data)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(403)
    })

    test('team member cannot delete others netpol', async () => {
      await agent
        .delete(`/v1/teams/${otherTeamId}/netpols/my-netpol`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(403)
        .expect('Content-Type', /json/)
    })

    test('team member can get its own team netpols', async () => {
      await agent
        .get(`/v1/teams/${teamId}/netpols`)
        .set('Authorization', `Bearer ${teamMemberToken}`)
        .expect(200)
        .expect('Content-Type', /json/)
    })

    test('team member cannot get others team netpols', async () => {
      await agent.get(`/v1/teams/${otherTeamId}/netpols`).set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
    })

    test('team member cannot get all netpols', async () => {
      await agent.get('/v1/netpols').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
    })

    test('platform admin can get all netpols', async () => {
      await agent.get('/v1/netpols').set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
    })
  })

  describe('Kubecfg endpoint tests', () => {
    test('team member can get its own kubecfg', async () => {
      jest.spyOn(otomiStack, 'getKubecfg').mockResolvedValue({ exportConfig: () => '{}' } as never)
      await agent.get(`/v1/kubecfg/${teamId}`).set('Authorization', `Bearer ${teamMemberToken}`).expect(200)
    })

    test('team member cannot get others kubecfg', async () => {
      await agent.get(`/v1/kubecfg/${otherTeamId}`).set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
    })

    test('team admin can get its own kubecfg', async () => {
      jest.spyOn(otomiStack, 'getKubecfg').mockResolvedValue({ exportConfig: () => '{}' } as never)
      await agent.get(`/v1/kubecfg/${teamId}`).set('Authorization', `Bearer ${teamAdminToken}`).expect(200)
    })

    test('team admin cannot get others kubecfg', async () => {
      await agent.get(`/v1/kubecfg/${otherTeamId}`).set('Authorization', `Bearer ${teamAdminToken}`).expect(403)
    })

    test('platform admin can get any kubecfg', async () => {
      jest.spyOn(otomiStack, 'getKubecfg').mockResolvedValue({ exportConfig: () => '{}' } as never)
      await agent.get(`/v1/kubecfg/${otherTeamId}`).set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
    })

    test('anonymous user cannot get kubecfg', async () => {
      await agent.get(`/v1/kubecfg/${teamId}`).expect(401)
    })
  })

  describe('DockerConfig endpoint tests', () => {
    test('team member can get its own dockerconfig', async () => {
      jest.spyOn(otomiStack, 'getDockerConfig').mockResolvedValue('{}')
      await agent.get(`/v1/dockerconfig/${teamId}`).set('Authorization', `Bearer ${teamMemberToken}`).expect(200)
    })

    test('team member cannot get others dockerconfig', async () => {
      await agent.get(`/v1/dockerconfig/${otherTeamId}`).set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
    })

    test('team admin can get its own dockerconfig', async () => {
      jest.spyOn(otomiStack, 'getDockerConfig').mockResolvedValue('{}')
      await agent.get(`/v1/dockerconfig/${teamId}`).set('Authorization', `Bearer ${teamAdminToken}`).expect(200)
    })

    test('team admin cannot get others dockerconfig', async () => {
      await agent.get(`/v1/dockerconfig/${otherTeamId}`).set('Authorization', `Bearer ${teamAdminToken}`).expect(403)
    })

    test('platform admin can get any dockerconfig', async () => {
      jest.spyOn(otomiStack, 'getDockerConfig').mockResolvedValue('{}')
      await agent
        .get(`/v1/dockerconfig/${otherTeamId}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)
    })

    test('anonymous user cannot get dockerconfig', async () => {
      await agent.get(`/v1/dockerconfig/${teamId}`).expect(401)
    })
  })

  test('team member cannot access settings', async () => {
    await agent.get('/v1/settings').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
  })
  test('team admin cannot access settings', async () => {
    await agent.get('/v1/settings').set('Authorization', `Bearer ${teamAdminToken}`).expect(403)
  })
})
