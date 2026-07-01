import { Express } from 'express'
import { mockDeep } from 'jest-mock-extended'
import { initApp, loadSpec } from 'src/app'
import getToken from 'src/fixtures/jwt'
import OtomiStack from 'src/otomi-stack'
import request from 'supertest'
import TestAgent from 'supertest/lib/agent'
import { FileStore } from './fileStore/file-store'
import { Git } from './git'
import { getSessionStack } from './middleware'
import { AplKind } from './otomi-models'
import * as getValuesSchemaModule from './utils'

const platformAdminToken = getToken(['platform-admin'])
const teamAdminToken = getToken(['team-admin', 'team-team1'])
const teamMemberToken = getToken(['team-team1'])
const team2MemberToken = getToken(['team-team2'])

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

function createNamedTeamResource(kind: AplKind, name: string, teamId: string, spec: Record<string, any>) {
  return {
    kind,
    metadata: {
      name,
      labels: { 'apl.io/teamId': teamId },
    },
    spec,
  }
}

function withStatus<T extends Record<string, any>>(
  resource: T,
): T & { status: { conditions: never[]; phase: string } } {
  return {
    ...resource,
    status: {
      conditions: [],
      phase: 'Ready',
    },
  }
}

const mockServiceResource = withStatus(
  createNamedTeamResource('AplTeamService', 'service1', 'team1', {
    serviceType: 'ksvcPredeployed',
    ingress: { type: 'cluster' },
    networkPolicy: { ingressPrivate: { mode: 'DenyAll' } },
  }),
)

const mockWorkloadResource = withStatus(
  createNamedTeamResource('AplTeamWorkload', 'my-uuid', 'team1', {
    url: 'https://test.local/',
    chart: 'some-chart',
  }),
)

const mockSealedSecretResource = withStatus({
  kind: 'SealedSecret',
  metadata: {
    name: 'my-secret',
    labels: { 'apl.io/teamId': 'team1' },
  },
  spec: {
    encryptedData: { key: 'value' },
    template: {
      type: 'kubernetes.io/opaque',
    },
  },
})

const mockCodeRepoResource = withStatus(
  createNamedTeamResource('AplTeamCodeRepo', 'my-repo', 'team1', {
    gitService: 'github',
    repositoryUrl: 'https://github.com/example/repo',
  }),
)

const mockBuildResource = withStatus(
  createNamedTeamResource('AplTeamBuild', 'build1', 'team1', {
    imageName: 'api-image',
    tag: 'main',
    mode: {
      type: 'buildpacks',
      buildpacks: {
        repoUrl: 'https://github.com/example/repo',
        path: '/',
        revision: 'main',
      },
    },
  }),
)

const mockNetpolResource = withStatus(
  createNamedTeamResource('AplTeamNetworkControl', 'netpol1', 'team1', {
    ruleType: {
      type: 'ingress',
      ingress: { mode: 'AllowAll' },
    },
  }),
)

const mockPolicyResource = withStatus(
  createNamedTeamResource('AplTeamPolicy', 'disallow-selinux', 'team1', {
    action: 'Enforce',
    severity: 'high',
  }),
)

const mockTeam1Resource = withStatus(
  createNamedTeamResource('AplTeamSettingSet', 'team1', 'team1', {
    selfService: {
      teamMembers: {
        createServices: true,
        editSecurityPolicies: true,
        useCloudShell: true,
        downloadKubeconfig: true,
        downloadDockerLogin: true,
      },
    },
  }),
)

const mockTeam2Resource = withStatus(
  createNamedTeamResource('AplTeamSettingSet', 'team2', 'team2', {
    selfService: {
      teamMembers: {
        createServices: false,
        editSecurityPolicies: false,
        useCloudShell: false,
        downloadKubeconfig: false,
        downloadDockerLogin: false,
      },
    },
  }),
)

jest.mock('./k8s-operations')
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
      metadata: {
        name: 'team1',
        labels: {
          'apl.io/teamId': 'team1',
        },
      },
      spec: {
        selfService: {
          teamMembers: {
            createServices: true,
            editSecurityPolicies: false,
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
            createServices: false,
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
    // Auto-mock all V2 API methods to prevent real execution
    const v2Methods = [
      // Teams
      'createAplTeam',
      'getAplTeams',
      'getAplTeam',
      'editAplTeam',
      'deleteAplTeam',
      // Services
      'createAplService',
      'getAplService',
      'editAplService',
      'deleteAplService',
      'getAllAplServices',
      'getTeamAplServices',
      // Workloads
      'createAplWorkload',
      'getAplWorkload',
      'editAplWorkload',
      'deleteAplWorkload',
      'getAllAplWorkloads',
      'getTeamAplWorkloads',
      // Sealed Secrets
      'createAplSealedSecret',
      'getAplSealedSecret',
      'editAplSealedSecret',
      'deleteAplSealedSecret',
      'getAllAplSealedSecrets',
      'getAplSealedSecrets',
      // Code Repos
      'createAplCodeRepo',
      'getAplCodeRepo',
      'editAplCodeRepo',
      'deleteAplCodeRepo',
      'getAllAplCodeRepos',
      'getTeamAplCodeRepos',
      // Builds
      'createAplBuild',
      'getAplBuild',
      'editAplBuild',
      'deleteAplBuild',
      'getAllAplBuilds',
      'getTeamAplBuilds',
      // Network Policies
      'createAplNetpol',
      'getAplNetpol',
      'editAplNetpol',
      'deleteAplNetpol',
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
      'createAplTeam',
      // Git migration
      'migrateGitSettings',
      // API status
      'getApiStatus',
    ]

    // Reset locked state so a prior git migration test does not bleed into subsequent tests
    otomiStack.locked = false

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

    jest.spyOn(otomiStack, 'getApiStatus').mockReturnValue({ locked: false })
    jest.spyOn(otomiStack, 'createAplService').mockResolvedValue(mockServiceResource as any)
    jest.spyOn(otomiStack, 'getAplService').mockReturnValue(mockServiceResource as any)
    jest.spyOn(otomiStack, 'editAplService').mockResolvedValue(mockServiceResource as any)
    jest.spyOn(otomiStack, 'getAllAplServices').mockReturnValue([mockServiceResource] as any)
    jest.spyOn(otomiStack, 'getTeamAplServices').mockReturnValue([mockServiceResource] as any)

    jest.spyOn(otomiStack, 'createAplWorkload').mockResolvedValue(mockWorkloadResource as any)
    jest.spyOn(otomiStack, 'getAplWorkload').mockReturnValue(mockWorkloadResource as any)
    jest.spyOn(otomiStack, 'editAplWorkload').mockResolvedValue(mockWorkloadResource as any)
    jest.spyOn(otomiStack, 'getAllAplWorkloads').mockReturnValue([mockWorkloadResource] as any)
    jest.spyOn(otomiStack, 'getTeamAplWorkloads').mockReturnValue([mockWorkloadResource] as any)

    jest.spyOn(otomiStack, 'createAplSealedSecret').mockResolvedValue(mockSealedSecretResource as any)
    jest.spyOn(otomiStack, 'getAplSealedSecret').mockResolvedValue(mockSealedSecretResource as any)
    jest.spyOn(otomiStack, 'editAplSealedSecret').mockResolvedValue(mockSealedSecretResource as any)
    jest.spyOn(otomiStack, 'getAllAplSealedSecrets').mockReturnValue([mockSealedSecretResource] as any)
    jest.spyOn(otomiStack, 'getAplSealedSecrets').mockReturnValue([mockSealedSecretResource] as any)

    jest.spyOn(otomiStack, 'createAplCodeRepo').mockResolvedValue(mockCodeRepoResource as any)
    jest.spyOn(otomiStack, 'getAplCodeRepo').mockReturnValue(mockCodeRepoResource as any)
    jest.spyOn(otomiStack, 'editAplCodeRepo').mockResolvedValue(mockCodeRepoResource as any)
    jest.spyOn(otomiStack, 'getAllAplCodeRepos').mockReturnValue([mockCodeRepoResource] as any)
    jest.spyOn(otomiStack, 'getTeamAplCodeRepos').mockReturnValue([mockCodeRepoResource] as any)

    jest.spyOn(otomiStack, 'createAplBuild').mockResolvedValue(mockBuildResource as any)
    jest.spyOn(otomiStack, 'getAplBuild').mockReturnValue(mockBuildResource as any)
    jest.spyOn(otomiStack, 'editAplBuild').mockResolvedValue(mockBuildResource as any)
    jest.spyOn(otomiStack, 'getAllAplBuilds').mockReturnValue([mockBuildResource] as any)
    jest.spyOn(otomiStack, 'getTeamAplBuilds').mockReturnValue([mockBuildResource] as any)

    jest.spyOn(otomiStack, 'createAplNetpol').mockResolvedValue(mockNetpolResource as any)
    jest.spyOn(otomiStack, 'getAplNetpol').mockReturnValue(mockNetpolResource as any)
    jest.spyOn(otomiStack, 'editAplNetpol').mockResolvedValue(mockNetpolResource as any)
    jest.spyOn(otomiStack, 'getAllAplNetpols').mockReturnValue([mockNetpolResource] as any)
    jest.spyOn(otomiStack, 'getTeamAplNetpols').mockReturnValue([mockNetpolResource] as any)

    jest.spyOn(otomiStack, 'getAplPolicy').mockReturnValue(mockPolicyResource as any)
    jest.spyOn(otomiStack, 'editAplPolicy').mockResolvedValue(mockPolicyResource as any)
    jest.spyOn(otomiStack, 'getAllAplPolicies').mockReturnValue([mockPolicyResource] as any)
    jest.spyOn(otomiStack, 'getTeamAplPolicies').mockReturnValue([mockPolicyResource] as any)
    jest.spyOn(otomiStack, 'createAplTeam').mockResolvedValue(mockTeam1Resource as any)
    jest.spyOn(otomiStack, 'editAplTeam').mockResolvedValue(mockTeam1Resource as any)
    jest.spyOn(otomiStack, 'getGitSettings').mockResolvedValue({
      repoUrl: 'https://github.com/example/repo.git',
      username: 'user',
      email: 'admin@example.com',
      branch: 'main',
    })
    jest.spyOn(otomiStack, 'getDashboard').mockResolvedValue([])

    const team1 = mockTeam1Resource

    const team2 = mockTeam2Resource

    jest.spyOn(otomiStack, 'getAplTeams').mockReturnValue([team1, team2] as any)
    jest.spyOn(otomiStack, 'getAplTeam').mockImplementation((teamId: string) => {
      if (teamId === 'team1') return team1 as any
      if (teamId === 'team2') return team2 as any
      throw new Error(`Team ${teamId} not found`)
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
    const secretData = {
      kind: 'SealedSecret',
      metadata: {
        name: 'test-secret',
      },
      spec: {
        encryptedData: { key: 'value' },
        template: {
          type: 'kubernetes.io/opaque',
        },
      },
    }

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

    describe('Code repository utility endpoints', () => {
      const data = {
        repositoryUrl: 'github.com/buildpacks/samples',
      }

      test('team member can test own code repository url', async () => {
        jest.spyOn(otomiStack, 'getTestRepoConnect').mockResolvedValue({ status: 'success' })

        await agent
          .get('/v2/teams/team1/coderepos/testRepoConnect')
          .query({
            url: data.repositoryUrl,
          })
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member cannot test other team code repository url', async () => {
        jest.spyOn(otomiStack, 'getTestRepoConnect').mockResolvedValue({ status: 'success' })

        await agent
          .get('/v2/teams/team2/coderepos/testRepoConnect')
          .query({
            url: data.repositoryUrl,
          })
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
      })

      test('team member can get own internal repository urls', async () => {
        jest.spyOn(otomiStack, 'getInternalRepoUrls').mockResolvedValue([])

        await agent
          .get('/v2/teams/team1/internalRepoUrls')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member cannot get other internal repository urls', async () => {
        jest.spyOn(otomiStack, 'getInternalRepoUrls').mockResolvedValue([])

        await agent
          .get('/v2/teams/team2/internalRepoUrls')
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(403)
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

      test('team member can update policy', async () => {
        await agent
          .put('/v2/teams/team1/policies/disallow-selinux')
          .send(policyData)
          .set('Authorization', `Bearer ${teamMemberToken}`)
          .expect(200)
      })

      test('team member cannot update policy', async () => {
        await agent
          .put('/v2/teams/team2/policies/disallow-selinux')
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

  describe('V2 Git Endpoint', () => {
    const gitBody = {
      repoUrl: 'https://new.example.com/repo.git',
      username: 'user',
      password: 'pass',
      email: 'admin@example.com',
      branch: 'main',
    }

    describe('GET /v2/git', () => {
      test('platform admin can read git settings', async () => {
        await agent.get('/v2/git').set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
      })

      test('team admin can read git settings', async () => {
        await agent.get('/v2/git').set('Authorization', `Bearer ${teamAdminToken}`).expect(200)
      })

      test('team member cannot read git settings', async () => {
        await agent.get('/v2/git').set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
      })

      test('anonymous user cannot read git settings', async () => {
        await agent.get('/v2/git').expect(401)
      })
    })

    describe('PUT /v2/git', () => {
      test('platform admin can migrate git', async () => {
        await agent.put('/v2/git').send(gitBody).set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
      })

      test('team admin cannot migrate git', async () => {
        await agent.put('/v2/git').send(gitBody).set('Authorization', `Bearer ${teamAdminToken}`).expect(403)
      })

      test('team member cannot migrate git', async () => {
        await agent.put('/v2/git').send(gitBody).set('Authorization', `Bearer ${teamMemberToken}`).expect(403)
      })

      test('anonymous user cannot migrate git', async () => {
        await agent.put('/v2/git').send(gitBody).expect(401)
      })
    })
  })

  describe('V2 API Status Endpoint', () => {
    describe('Platform Admin', () => {
      test('platform admin can get api status', async () => {
        await agent.get('/v2/status').set('Authorization', `Bearer ${platformAdminToken}`).expect(200)
      })
    })

    describe('Team Admin', () => {
      test('team admin can get api status', async () => {
        await agent.get('/v2/status').set('Authorization', `Bearer ${teamAdminToken}`).expect(200)
      })
    })

    describe('Team Member', () => {
      test('team member can get api status', async () => {
        const res = await agent.get('/v2/status').set('Authorization', `Bearer ${teamMemberToken}`)
        await expect(res.status).toBe(200)
      })
    })

    describe('Unauthenticated', () => {
      test('anonymous user cannot get api status', async () => {
        await agent.get('/v2/status').expect(401)
      })
    })
  })

  test('team member cannot create its own services when disabled', async () => {
    jest.spyOn(otomiStack, 'createAplService').mockResolvedValue({} as any)

    await agent
      .post('/v2/teams/team2/services')
      .send({
        kind: 'AplTeamService',
        metadata: {
          name: 'newservice',
        },
        spec: {
          serviceType: 'ksvcPredeployed',
          ingress: {
            type: 'cluster',
          },
          networkPolicy: {
            ingressPrivate: {
              mode: 'DenyAll',
            },
          },
        },
      })
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${team2MemberToken}`)
      .expect(403)
      .expect('Content-Type', /json/)
  })
})
