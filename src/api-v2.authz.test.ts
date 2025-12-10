import { Express } from 'express'
import { mockDeep } from 'jest-mock-extended'
import { initApp, loadSpec } from 'src/app'
import getToken from 'src/fixtures/jwt'
import OtomiStack from 'src/otomi-stack'
import request from 'supertest'
import { Git } from './git'
import { getSessionStack } from './middleware'
import * as getValuesSchemaModule from './utils'
import TestAgent from 'supertest/lib/agent'
import { FileStore } from './fileStore/file-store'
import { AplKind } from './otomi-models'

const platformAdminToken = getToken(['platform-admin'])
const teamAdminToken = getToken(['team-admin', 'team-team1'])
const teamMemberToken = getToken(['team-team1'])

function createTeamResource(kind: AplKind, spec: Record<string, any>) {
  return {
    kind,
    metadata: {
      name: 'test-team',
      labels: { 'apl.io/teamId': 'test-team' },
    },
    spec,
  }
}

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

describe('API V2 authz tests', () => {
  let app: Express
  let otomiStack: OtomiStack
  let agent: TestAgent

  beforeAll(async () => {
    // Get real OtomiStack instance (needed for internal state)
    const _otomiStack = await getSessionStack()
    _otomiStack.git = mockDeep<Git>()
    _otomiStack.fileStore = new FileStore()
    otomiStack = _otomiStack as jest.Mocked<OtomiStack>

    // Mock methods that need custom behavior
    otomiStack.saveTeam = jest.fn().mockResolvedValue(undefined)
    otomiStack.doDeleteDeployment = jest.fn().mockImplementation(() => Promise.resolve())
    otomiStack.doDeployment = jest.fn().mockImplementation(() => Promise.resolve())
    otomiStack.fileStore.set('env/teams/team1/settings.yaml', {
      kind: 'AplTeamSettingSet',
      spec: {},
      metadata: {
        name: 'team1',
        labels: {
          'apl.io/teamId': 'team1',
        },
      },
    })
    otomiStack.fileStore.set('env/teams/team2/settings.yaml', {
      kind: 'AplTeamSettingSet',
      spec: {},
      metadata: {
        name: 'team2',
        labels: {
          'apl.io/teamId': 'team2',
        },
      },
    })
    otomiStack.isLoaded = true
    app = await initApp(otomiStack)
    agent = request.agent(app)
    agent.set('Accept', 'application/json')
  })

  beforeEach(() => {
    // Auto-mock all V2 API methods to prevent real execution
    const v2Methods = [
      // Teams
      'createAplTeam',
      'getAplTeams',
      'getAplTeam',
      'editAplTeam',
      'deleteTeam',
      // Services
      'createAplService',
      'getAplService',
      'editAplService',
      'deleteService',
      'getAllAplServices',
      'getTeamAplServices',
      // Workloads
      'createAplWorkload',
      'getAplWorkload',
      'editAplWorkload',
      'deleteWorkload',
      'getAllAplWorkloads',
      'getTeamAplWorkloads',
      // Sealed Secrets
      'createAplSealedSecret',
      'getAplSealedSecret',
      'editAplSealedSecret',
      'deleteSealedSecret',
      'getAllAplSealedSecrets',
      'getAplSealedSecrets',
      // Code Repos
      'createAplCodeRepo',
      'getAplCodeRepo',
      'editAplCodeRepo',
      'deleteCodeRepo',
      'getAllAplCodeRepos',
      'getTeamAplCodeRepos',
      // Builds
      'createAplBuild',
      'getAplBuild',
      'editAplBuild',
      'deleteBuild',
      'getAllAplBuilds',
      'getTeamAplBuilds',
      // Network Policies
      'createAplNetpol',
      'getAplNetpol',
      'editAplNetpol',
      'deleteNetpol',
      'getAllAplNetpols',
      'getTeamAplNetpols',
      // Policies
      'getAplPolicy',
      'editAplPolicy',
      'getAllAplPolicies',
      'getTeamAplPolicies',
      // CloudTTY
      'connectCloudtty',
      'deleteCloudtty',
      // Other
      'createTeam',
    ]

    // Mock all methods with default return values
    v2Methods.forEach((method) => {
      if (typeof (otomiStack as any)[method] === 'function') {
        jest.spyOn(otomiStack as any, method).mockImplementation(() => {
          // Return appropriate mock based on method name
          if (method.startsWith('getAll') || method.startsWith('getTeam') || method.includes('Agents')) {
            return []
          } else if (method.startsWith('delete') || method.startsWith('edit')) {
            return Promise.resolve()
          } else {
            return Promise.resolve({})
          }
        })
      }
    })
  })

  describe('V2 Team Endpoints', () => {
    const teamData = createTeamResource('AplTeamSettingSet', { resourceQuota: [] })

    describe('Platform Admin', () => {
      test('platform admin can get all teams', async () => {
        await agent.get('/v2/teams').set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
      })

      test('platform admin can create a team', async () => {
        await agent.post('/v2/teams').send(teamData).set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
      })

      test('platform admin can get specific team', async () => {
        await agent.get('/v2/teams/team1').set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
      })

      test('platform admin can update team', async () => {
        await agent
          .put('/v2/teams/team1')
          .send(teamData)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .expect(200)
      })

      test('platform admin can delete team', async () => {
        await agent.delete('/v2/teams/team1').set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
      })
    })

    describe('Team Member', () => {
      test('team member cannot get all teams', async () => {
        await agent.get('/v2/teams').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
      })

      test('team member can get own team', async () => {
        await agent.get('/v2/teams/team1').set('Authorization', `Bearer ${teamMemberToken}`).expect(200)
      })

      test('team member cannot get other team', async () => {
        await agent.get('/v2/teams/team2').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
      })

      test('team member cannot create team', async () => {
        await agent.post('/v2/teams').send(teamData).set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
      })

      test('team member cannot update other team', async () => {
        await agent.put('/v2/teams/team1').send(teamData).set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
      })

      test('team member cannot delete team', async () => {
        await agent.delete('/v2/teams/team1').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
      })
    })

    describe('Team Admin', () => {
      test('team member cannot get all teams', async () => {
        await agent.get('/v2/teams').set('Authorization', `Bearer ${teamAdminToken}`).expect(403)
      })

      test('team member can get own team', async () => {
        await agent.get('/v2/teams/team1').set('Authorization', `Bearer ${teamAdminToken}`).expect(200)
      })

      test('team member can update other team', async () => {
        await agent.put('/v2/teams/team1').send(teamData).set('Authorization', `Bearer ${teamAdminToken}`).expect(200)
      })

      test('team member cannot get other team', async () => {
        await agent.get('/v2/teams/team2').set('Authorization', `Bearer ${teamAdminToken}`).expect(403)
      })

      test('team member cannot create team', async () => {
        await agent.post('/v2/teams').send(teamData).set('Authorization', `Bearer ${teamAdminToken}`).expect(403)
      })

      test('team member cannot delete team', async () => {
        await agent.delete('/v2/teams/team1').set('Authorization', `Bearer ${teamAdminToken}`).expect(403)
      })
    })

    describe('Unauthenticated', () => {
      test('anonymous user cannot get all teams', async () => {
        await agent.get('/v2/teams').expect(401)
      })

      test('anonymous user cannot get specific team', async () => {
        await agent.get('/v2/teams/team1').expect(401)
      })

      test('anonymous user cannot create team', async () => {
        await agent.post('/v2/teams').send(teamData).expect(401)
      })

      test('anonymous user cannot update team', async () => {
        await agent.put('/v2/teams/team1').send(teamData).expect(401)
      })

      test('anonymous user cannot delete team', async () => {
        await agent.delete('/v2/teams/team1').expect(401)
      })
    })
  })

  describe('V2 Service Endpoints', () => {
    const serviceData = createTeamResource('AplTeamService', {
      serviceType: 'ksvcPredeployed',
      ingress: { type: 'cluster' },
      networkPolicy: { ingressPrivate: { mode: 'DenyAll' } },
    })

    describe('Platform Admin', () => {
      test('platform admin can get all services', async () => {
        await agent.get('/v2/services').set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
      })
    })

    describe('Team-Scoped Operations', () => {
      test('team member can create service', async () => {
        await agent
          .post('/v2/teams/team1/services')
          .send(serviceData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member can get team services', async () => {
        await agent.get('/v2/teams/team1/services').set('Authorization', `Bearer ${teamMemberToken}`).expect(200)
      })

      test('team member can get specific service', async () => {
        await agent
          .get('/v2/teams/team1/services/service1')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member can update service', async () => {
        await agent
          .put('/v2/teams/team1/services/service1')
          .send(serviceData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member can delete service', async () => {
        await agent
          .delete('/v2/teams/team1/services/service1')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })
    })

    describe('Cross-Team Access Denial', () => {
      test('team member cannot create service in other team', async () => {
        await agent
          .post('/v2/teams/team2/services')
          .send(serviceData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })

      test('team member cannot get services from other team', async () => {
        await agent.get('/v2/teams/team2/services').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
      })

      test('team member cannot update service in other team', async () => {
        await agent
          .put('/v2/teams/team2/services/service1')
          .send(serviceData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })

      test('team member cannot delete service in other team', async () => {
        await agent
          .delete('/v2/teams/team2/services/service1')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })
    })

    describe('Unauthenticated', () => {
      test('anonymous user cannot get all services', async () => {
        await agent.get('/v2/services').expect(401)
      })

      test('anonymous user cannot get team services', async () => {
        await agent.get('/v2/teams/team1/services').expect(401)
      })

      test('anonymous user cannot create service', async () => {
        await agent.post('/v2/teams/team1/services').send(serviceData).expect(401)
      })

      test('anonymous user cannot get specific service', async () => {
        await agent.get('/v2/teams/team1/services/service1').expect(401)
      })

      test('anonymous user cannot update service', async () => {
        await agent.put('/v2/teams/team1/services/service1').send(serviceData).expect(401)
      })

      test('anonymous user cannot delete service', async () => {
        await agent.delete('/v2/teams/team1/services/service1').expect(401)
      })
    })
  })

  describe('V2 Workload Endpoints', () => {
    const workloadData = createTeamResource('AplTeamWorkload', {
      url: 'https://test.local/',
      chart: 'some-chart',
    })

    describe('Platform Admin', () => {
      test('platform admin can get all workloads', async () => {
        await agent.get('/v2/workloads').set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
      })

      test('platform admin can get workload names', async () => {
        await agent.get('/v2/workloadNames').set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
      })
    })

    describe('Team-Scoped Operations', () => {
      test('team member can create workload', async () => {
        await agent
          .post('/v2/teams/team1/workloads')
          .send(workloadData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member can get team workloads', async () => {
        await agent.get('/v2/teams/team1/workloads').set('Authorization', `Bearer ${teamMemberToken}`).expect(200)
      })

      test('team member can get specific workload', async () => {
        await agent
          .get('/v2/teams/team1/workloads/my-uuid')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member can update workload', async () => {
        await agent
          .put('/v2/teams/team1/workloads/my-uuid')
          .send(workloadData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member can delete workload', async () => {
        await agent
          .delete('/v2/teams/team1/workloads/my-uuid')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member can get workload names', async () => {
        await agent.get('/v2/workloadNames').set('Authorization', `Bearer ${teamMemberToken}`).expect(200)
      })
    })

    describe('Cross-Team Access Denial', () => {
      test('team member cannot create workload in other team', async () => {
        await agent
          .post('/v2/teams/team2/workloads')
          .send(workloadData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })

      test('team member cannot get workloads from other team', async () => {
        await agent.get('/v2/teams/team2/workloads').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
      })

      test('team member cannot update workload in other team', async () => {
        await agent
          .put('/v2/teams/team2/workloads/my-uuid')
          .send(workloadData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })

      test('team member cannot delete workload in other team', async () => {
        await agent
          .delete('/v2/teams/team2/workloads/my-uuid')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })

      test('team member cannot get workload names', async () => {
        await agent.get('/v2/workloadNames').set('Authorization', `Bearer ${teamMemberToken}`).expect(200)
      })
    })

    describe('Unauthenticated', () => {
      test('anonymous user cannot get all workloads', async () => {
        await agent.get('/v2/workloads').expect(401)
      })

      test('anonymous user cannot get workload names', async () => {
        await agent.get('/v2/workloadNames').expect(401)
      })

      test('anonymous user cannot get team workloads', async () => {
        await agent.get('/v2/teams/team1/workloads').expect(401)
      })

      test('anonymous user cannot create workload', async () => {
        await agent.post('/v2/teams/team1/workloads').send(workloadData).expect(401)
      })

      test('anonymous user cannot get specific workload', async () => {
        await agent.get('/v2/teams/team1/workloads/my-uuid').expect(401)
      })

      test('anonymous user cannot update workload', async () => {
        await agent.put('/v2/teams/team1/workloads/my-uuid').send(workloadData).expect(401)
      })

      test('anonymous user cannot delete workload', async () => {
        await agent.delete('/v2/teams/team1/workloads/my-uuid').expect(401)
      })
    })
  })

  describe('V2 Sealed Secret Endpoints', () => {
    const secretData = createTeamResource('AplTeamSecret', {
      type: 'kubernetes.io/opaque',
      encryptedData: { key: 'value' },
    })

    describe('Platform Admin', () => {
      test('platform admin can get all sealed secrets', async () => {
        await agent.get('/v2/sealedsecrets').set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
      })
    })

    describe('Team-Scoped Operations', () => {
      test('team member can create sealed secret', async () => {
        await agent
          .post('/v2/teams/team1/sealedsecrets')
          .send(secretData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member can get team sealed secrets', async () => {
        await agent.get('/v2/teams/team1/sealedsecrets').set('Authorization', `Bearer ${teamMemberToken}`).expect(200)
      })

      test('team member can get specific sealed secret', async () => {
        await agent
          .get('/v2/teams/team1/sealedsecrets/my-secret')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member can update sealed secret', async () => {
        await agent
          .put('/v2/teams/team1/sealedsecrets/my-secret')
          .send(secretData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member can delete sealed secret', async () => {
        await agent
          .delete('/v2/teams/team1/sealedsecrets/my-secret')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })
    })

    describe('Cross-Team Access Denial', () => {
      test('team member cannot create sealed secret in other team', async () => {
        await agent
          .post('/v2/teams/team2/sealedsecrets')
          .send(secretData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })

      test('team member cannot get sealed secrets from other team', async () => {
        await agent.get('/v2/teams/team2/sealedsecrets').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
      })

      test('team member cannot read others sealed secret', async () => {
        await agent
          .get('/v2/teams/team2/sealedsecrets/my-secret')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })

      test('team member cannot update sealed secret in other team', async () => {
        await agent
          .put('/v2/teams/team2/sealedsecrets/my-secret')
          .send(secretData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })

      test('team member cannot delete sealed secret in other team', async () => {
        await agent
          .delete('/v2/teams/team2/sealedsecrets/my-secret')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })
    })

    describe('Unauthenticated', () => {
      test('anonymous user cannot get all sealed secrets', async () => {
        await agent.get('/v2/sealedsecrets').expect(401)
      })

      test('anonymous user cannot get team sealed secrets', async () => {
        await agent.get('/v2/teams/team1/sealedsecrets').expect(401)
      })

      test('anonymous user cannot create sealed secret', async () => {
        await agent.post('/v2/teams/team1/sealedsecrets').send(secretData).expect(401)
      })

      test('anonymous user cannot get specific sealed secret', async () => {
        await agent.get('/v2/teams/team1/sealedsecrets/my-secret').expect(401)
      })

      test('anonymous user cannot update sealed secret', async () => {
        await agent.put('/v2/teams/team1/sealedsecrets/my-secret').send(secretData).expect(401)
      })

      test('anonymous user cannot delete sealed secret', async () => {
        await agent.delete('/v2/teams/team1/sealedsecrets/my-secret').expect(401)
      })
    })
  })

  describe('V2 Code Repository Endpoints', () => {
    const repoData = createTeamResource('AplTeamCodeRepo', {
      gitService: 'github',
      repositoryUrl: 'https://github.com/example/repo',
    })

    describe('Platform Admin', () => {
      test('platform admin can get all code repositories', async () => {
        await agent.get('/v2/coderepos').set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
      })
    })

    describe('Team-Scoped Operations', () => {
      test('team member can create code repo', async () => {
        await agent
          .post('/v2/teams/team1/coderepos')
          .send(repoData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member can get team code repos', async () => {
        await agent.get('/v2/teams/team1/coderepos').set('Authorization', `Bearer ${teamMemberToken}`).expect(200)
      })

      test('team member can get specific code repo', async () => {
        await agent
          .get('/v2/teams/team1/coderepos/my-repo')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member can update code repo', async () => {
        await agent
          .put('/v2/teams/team1/coderepos/my-repo')
          .send(repoData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member can delete code repo', async () => {
        await agent
          .delete('/v2/teams/team1/coderepos/my-repo')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })
    })

    describe('Cross-Team Access Denial', () => {
      test('team member cannot create code repo in other team', async () => {
        await agent
          .post('/v2/teams/team2/coderepos')
          .send(repoData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })

      test('team member cannot get code repos from other team', async () => {
        await agent.get('/v2/teams/team2/coderepos').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
      })

      test('team member cannot read others code repo', async () => {
        await agent
          .get('/v2/teams/team2/coderepos/my-repo')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })

      test('team member cannot update code repo in other team', async () => {
        await agent
          .put('/v2/teams/team2/coderepos/my-repo')
          .send(repoData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })

      test('team member cannot delete code repo in other team', async () => {
        await agent
          .delete('/v2/teams/team2/coderepos/my-repo')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })
    })

    describe('Unauthenticated', () => {
      test('anonymous user cannot get all code repos', async () => {
        await agent.get('/v2/coderepos').expect(401)
      })

      test('anonymous user cannot get team code repos', async () => {
        await agent.get('/v2/teams/team1/coderepos').expect(401)
      })

      test('anonymous user cannot create code repo', async () => {
        await agent.post('/v2/teams/team1/coderepos').send(repoData).expect(401)
      })

      test('anonymous user cannot get specific code repo', async () => {
        await agent.get('/v2/teams/team1/coderepos/my-repo').expect(401)
      })

      test('anonymous user cannot update code repo', async () => {
        await agent.put('/v2/teams/team1/coderepos/my-repo').send(repoData).expect(401)
      })

      test('anonymous user cannot delete code repo', async () => {
        await agent.delete('/v2/teams/team1/coderepos/my-repo').expect(401)
      })
    })
  })

  describe('V2 Build Endpoints', () => {
    const buildData = createTeamResource('AplTeamBuild', {
      mode: {
        type: 'buildpacks',
        buildpacks: {
          repoUrl: 'https://github.com/example/repo',
          path: '/',
          revision: 'main',
        },
      },
    })

    describe('Platform Admin', () => {
      test('platform admin can get all builds', async () => {
        await agent.get('/v2/builds').set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
      })
    })

    describe('Team-Scoped Operations', () => {
      test('team member can create build', async () => {
        await agent
          .post('/v2/teams/team1/builds')
          .send(buildData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member can get team builds', async () => {
        await agent.get('/v2/teams/team1/builds').set('Authorization', `Bearer ${teamMemberToken}`).expect(200)
      })

      test('team member can get specific build', async () => {
        await agent.get('/v2/teams/team1/builds/build1').set('Authorization', `Bearer ${teamMemberToken}`).expect(200)
      })

      test('team member can update build', async () => {
        await agent
          .put('/v2/teams/team1/builds/build1')
          .send(buildData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member can delete build', async () => {
        await agent
          .delete('/v2/teams/team1/builds/build1')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })
    })

    describe('Cross-Team Access Denial', () => {
      test('team member cannot create build in other team', async () => {
        await agent
          .post('/v2/teams/team2/builds')
          .send(buildData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })

      test('team member cannot get builds from other team', async () => {
        await agent.get('/v2/teams/team2/builds').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
      })

      test('team member cannot get specific build from other team', async () => {
        await agent.get('/v2/teams/team2/builds/build1').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
      })

      test('team member cannot update build in other team', async () => {
        await agent
          .put('/v2/teams/team2/builds/build1')
          .send(buildData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })

      test('team member cannot delete build in other team', async () => {
        await agent
          .delete('/v2/teams/team2/builds/build1')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })
    })

    describe('Unauthenticated', () => {
      test('anonymous user cannot get all builds', async () => {
        await agent.get('/v2/builds').expect(401)
      })

      test('anonymous user cannot get team builds', async () => {
        await agent.get('/v2/teams/team1/builds').expect(401)
      })

      test('anonymous user cannot create build', async () => {
        await agent.post('/v2/teams/team1/builds').send(buildData).expect(401)
      })

      test('anonymous user cannot get specific build', async () => {
        await agent.get('/v2/teams/team1/builds/build1').expect(401)
      })

      test('anonymous user cannot update build', async () => {
        await agent.put('/v2/teams/team1/builds/build1').send(buildData).expect(401)
      })

      test('anonymous user cannot delete build', async () => {
        await agent.delete('/v2/teams/team1/builds/build1').expect(401)
      })
    })
  })

  describe('V2 Network Policy Endpoints', () => {
    const netpolData = createTeamResource('AplTeamNetworkControl', {
      ruleType: {
        type: 'ingress',
        ingress: { mode: 'AllowAll' },
      },
    })

    describe('Platform Admin', () => {
      test('platform admin can get all network policies', async () => {
        await agent.get('/v2/netpols').set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
      })
    })

    describe('Team-Scoped Operations', () => {
      test('team member can create network policy', async () => {
        await agent
          .post('/v2/teams/team1/netpols')
          .send(netpolData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member can get team network policies', async () => {
        await agent.get('/v2/teams/team1/netpols').set('Authorization', `Bearer ${teamMemberToken}`).expect(200)
      })

      test('team member can get specific network policy', async () => {
        await agent.get('/v2/teams/team1/netpols/netpol1').set('Authorization', `Bearer ${teamMemberToken}`).expect(200)
      })

      test('team member can update network policy', async () => {
        await agent
          .put('/v2/teams/team1/netpols/netpol1')
          .send(netpolData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member can delete network policy', async () => {
        await agent
          .delete('/v2/teams/team1/netpols/netpol1')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })
    })

    describe('Cross-Team Access Denial', () => {
      test('team member cannot create network policy in other team', async () => {
        await agent
          .post('/v2/teams/team2/netpols')
          .send(netpolData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })

      test('team member cannot get network policies from other team', async () => {
        await agent.get('/v2/teams/team2/netpols').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
      })

      test('team member cannot get specific network policy from other team', async () => {
        await agent.get('/v2/teams/team2/netpols/netpol1').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
      })

      test('team member cannot update network policy in other team', async () => {
        await agent
          .put('/v2/teams/team2/netpols/netpol1')
          .send(netpolData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })

      test('team member cannot delete network policy in other team', async () => {
        await agent
          .delete('/v2/teams/team2/netpols/netpol1')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })
    })

    describe('Unauthenticated', () => {
      test('anonymous user cannot get all network policies', async () => {
        await agent.get('/v2/netpols').expect(401)
      })

      test('anonymous user cannot get team network policies', async () => {
        await agent.get('/v2/teams/team1/netpols').expect(401)
      })

      test('anonymous user cannot create network policy', async () => {
        await agent.post('/v2/teams/team1/netpols').send(netpolData).expect(401)
      })

      test('anonymous user cannot get specific network policy', async () => {
        await agent.get('/v2/teams/team1/netpols/netpol1').expect(401)
      })

      test('anonymous user cannot update network policy', async () => {
        await agent.put('/v2/teams/team1/netpols/netpol1').send(netpolData).expect(401)
      })

      test('anonymous user cannot delete network policy', async () => {
        await agent.delete('/v2/teams/team1/netpols/netpol1').expect(401)
      })
    })
  })

  describe('V2 Policy Endpoints', () => {
    const policyData = createTeamResource('AplTeamPolicy', { action: 'Enforce', severity: 'high' })

    describe('Platform Admin', () => {
      test('platform admin can get all policies', async () => {
        await agent.get('/v2/policies').set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
      })

      test('platform admin can get team policies', async () => {
        await agent.get('/v2/teams/team1/policies').set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
      })

      test('platform admin can get specific policy', async () => {
        await agent
          .get('/v2/teams/team1/policies/disallow-selinux')
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .expect(200)
      })

      test('platform admin can update policy', async () => {
        await agent
          .put('/v2/teams/team1/policies/disallow-selinux')
          .send(policyData)
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .expect(200)
      })
    })

    describe('Team Member', () => {
      test('team member can get team policies', async () => {
        await agent.get('/v2/teams/team1/policies').set('Authorization', `Bearer ${teamMemberToken}`).expect(200)
      })

      test('team member can get specific policy', async () => {
        await agent
          .get('/v2/teams/team1/policies/disallow-selinux')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member cannot update policy', async () => {
        await agent
          .put('/v2/teams/team1/policies/disallow-selinux')
          .send(policyData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })

      test('team member cannot get all policies', async () => {
        await agent.get('/v2/policies').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
      })

      test('team member cannot access other team policies', async () => {
        await agent.get('/v2/teams/team2/policies').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
      })
    })

    describe('Unauthenticated', () => {
      test('anonymous user cannot get all policies', async () => {
        await agent.get('/v2/policies').expect(401)
      })

      test('anonymous user cannot get team policies', async () => {
        await agent.get('/v2/teams/team1/policies').expect(401)
      })

      test('anonymous user cannot get specific policy', async () => {
        await agent.get('/v2/teams/team1/policies/disallow-selinux').expect(401)
      })

      test('anonymous user cannot update policy', async () => {
        await agent.put('/v2/teams/team1/policies/disallow-selinux').send(policyData).expect(401)
      })
    })
  })

  describe('V2 Cloud TTY Endpoints', () => {
    describe('Platform Admin', () => {
      test('platform admin can connect cloudtty', async () => {
        await agent
          .get('/v2/cloudtty')
          .query({ teamId: 'team1' })
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .expect(200)
      })

      test('platform admin can delete cloudtty', async () => {
        await agent.delete('/v2/cloudtty').set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
      })
    })

    describe('Team Member', () => {
      test('team member can connect cloudtty for own team', async () => {
        await agent
          .get('/v2/cloudtty')
          .query({ teamId: 'team1' })
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      //TODO check if this is the desired behavior
      test('team member cannot connect cloudtty for other team', async () => {
        await agent
          .get('/v2/cloudtty')
          .query({ teamId: 'team2' })
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })
    })

    describe('Unauthenticated', () => {
      test('anonymous user cannot connect cloudtty', async () => {
        await agent.get('/v2/cloudtty').query({ teamId: 'team1' }).expect(401)
      })

      test('anonymous user cannot delete cloudtty', async () => {
        await agent.delete('/v2/cloudtty').expect(401)
      })
    })
  })

  describe('V1 Dashboard Endpoints', () => {
    describe('Platform Admin', () => {
      test('platform admin can connect dashboard', async () => {
        await agent
          .get('/v1/dashboard')
          .query({ teamId: 'team1' })
          .set('Authorization', `Bearer ${platformAdminToken}`)
          .expect(200)
      })
    })

    describe('Team Member', () => {
      test('team member can connect dashboard for own team', async () => {
        await agent
          .get('/v1/dashboard')
          .query({ teamId: 'team1' })
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member cannot connect dashboard for other team', async () => {
        await agent
          .get('/v1/dashboard')
          .query({ teamId: 'team2' })
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })
    })

    describe('Unauthenticated', () => {
      test('anonymous user cannot connect dashboard', async () => {
        await agent.get('/v1/dashboard').query({ teamId: 'team1' }).expect(401)
      })
    })
  })
})
