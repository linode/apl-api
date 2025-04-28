// Mock UUID to generate predictable values
import { AlreadyExists, NotExistError } from '../error'
import {
  AplBackupRequest,
  AplBuildRequest,
  AplNetpolRequest,
  AplProjectRequest,
  AplSecretRequest,
  AplServiceRequest,
  AplWorkloadRequest,
  App,
  TeamConfig,
} from '../otomi-models'
import { TeamConfigService } from './TeamConfigService'

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}))

describe('TeamConfigService', () => {
  let service: TeamConfigService
  let teamConfig: TeamConfig

  beforeEach(() => {
    const teamSettings = {
      kind: 'AplTeamSettingSet',
      metadata: {
        name: 'team1',
        labels: {
          'apl.io/teamId': 'team1',
        },
      },
      spec: {},
      status: {},
    }
    teamConfig = {
      builds: [],
      codeRepos: [],
      workloads: [],
      workloadValues: [],
      services: [],
      sealedsecrets: [],
      backups: [],
      projects: [],
      netpols: [],
      apps: [],
      policies: [],
      settings: teamSettings,
    } as TeamConfig
    service = new TeamConfigService(teamConfig)
  })

  describe('Builds', () => {
    const build: AplBuildRequest = {
      kind: 'AplTeamBuild',
      metadata: { name: 'TestBuild' },
      spec: {},
    }
    test('should create a build', () => {
      const createdBuild = service.createBuild(build)

      expect(createdBuild).toEqual({
        kind: 'AplTeamBuild',
        metadata: {
          name: 'TestBuild',
          labels: {
            'apl.io/teamId': 'team1',
          },
        },
        spec: {},
        status: {},
      })
      expect(service.getBuilds()).toHaveLength(1)
    })

    test('should throw an error if creating a duplicate build', () => {
      service.createBuild(build)

      expect(() => service.createBuild(build)).toThrow(AlreadyExists)
    })

    test('should retrieve a build by id', () => {
      const createdBuild = service.createBuild(build)

      expect(service.getBuild(createdBuild.metadata.name)).toEqual(createdBuild)
    })

    test('should throw an error when retrieving a non-existent build', () => {
      expect(() => service.getBuild('non-existent')).toThrow(NotExistError)
    })

    test('should update a build', () => {
      const createdBuild = service.createBuild(build)

      const updatedBuild = service.patchBuild(createdBuild.metadata.name, {
        metadata: { name: 'UpdatedBuild' },
      })
      expect(updatedBuild.metadata.name).toBe('UpdatedBuild')
    })

    test('should delete a build', () => {
      const createdBuild = service.createBuild(build)

      service.deleteBuild(createdBuild.metadata.name)
      expect(service.getBuilds()).toHaveLength(0)
    })
  })

  describe('Workloads', () => {
    const workload: AplWorkloadRequest = {
      kind: 'AplTeamWorkload',
      metadata: {
        name: 'TestWorkload',
      },
      spec: {
        url: 'http://test.com',
        values: '',
      },
    }
    test('should create a workload', () => {
      const createdWorkload = service.createWorkload(workload)

      expect(createdWorkload).toEqual({
        kind: 'AplTeamWorkload',
        metadata: {
          name: 'TestWorkload',
          labels: {
            'apl.io/teamId': 'team1',
          },
        },
        spec: {
          url: 'http://test.com',
          values: '',
        },
        status: {},
      })
      expect(service.getWorkloads()).toHaveLength(1)
    })

    test('should throw an error if creating a duplicate workload', () => {
      service.createWorkload(workload)

      expect(() => service.createWorkload(workload)).toThrow(AlreadyExists)
    })

    test('should retrieve a workload by id', () => {
      const createdWorkload = service.createWorkload(workload)

      expect(service.getWorkload(createdWorkload.metadata.name)).toEqual(createdWorkload)
    })

    test('should throw an error when retrieving a non-existent workload', () => {
      expect(() => service.getWorkload('non-existent')).toThrow(NotExistError)
    })

    test('should delete a workload', () => {
      const createdWorkload = service.createWorkload(workload)

      service.deleteWorkload(createdWorkload.metadata.name)
      expect(service.getWorkloads()).toHaveLength(0)
    })
  })

  describe('Services', () => {
    const serviceData: AplServiceRequest = {
      kind: 'AplTeamService',
      metadata: { name: 'TestService' },
      spec: {},
    }
    test('should create a service', () => {
      const createdService = service.createService(serviceData)

      expect(createdService).toEqual({
        kind: 'AplTeamService',
        metadata: {
          name: 'TestService',
          labels: {
            'apl.io/teamId': 'team1',
          },
        },
        spec: {},
        status: {},
      })
      expect(service.getServices()).toHaveLength(1)
    })

    test('should throw an error if creating a duplicate service', () => {
      service.createService(serviceData)

      expect(() => service.createService(serviceData)).toThrow(AlreadyExists)
    })

    test('should retrieve a service by id', () => {
      const createdService = service.createService(serviceData)

      expect(service.getService(createdService.metadata.name)).toEqual(createdService)
    })

    test('should throw an error when retrieving a non-existent service', () => {
      expect(() => service.getService('non-existent')).toThrow(NotExistError)
    })

    test('should delete a service', () => {
      const createdService = service.createService(serviceData)

      service.deleteService(createdService.metadata.name)
      expect(service.getServices()).toHaveLength(0)
    })
  })

  describe('SealedSecrets', () => {
    const secret: AplSecretRequest = {
      kind: 'AplTeamSecret',
      metadata: { name: 'TestSecret' },
      spec: {
        type: 'kubernetes.io/opaque',
        encryptedData: { key: 'value' },
      },
    }
    test('should create a sealed secret', () => {
      const createdSecret = service.createSealedSecret(secret)

      expect(createdSecret).toEqual({
        kind: 'AplTeamSecret',
        metadata: {
          name: 'TestSecret',
          labels: {
            'apl.io/teamId': 'team1',
          },
        },
        spec: {
          type: 'kubernetes.io/opaque',
          encryptedData: { key: 'value' },
        },
        status: {},
      })
      expect(service.getSealedSecrets()).toHaveLength(1)
    })

    test('should throw an error if creating a duplicate sealed secret', () => {
      service.createSealedSecret(secret)

      expect(() => service.createSealedSecret(secret)).toThrow(AlreadyExists)
    })

    test('should retrieve a sealed secret by id', () => {
      const createdSecret = service.createSealedSecret(secret)

      expect(service.getSealedSecret(createdSecret.metadata.name)).toEqual(createdSecret)
    })

    test('should throw an error when retrieving a non-existent sealed secret', () => {
      expect(() => service.getSealedSecret('non-existent')).toThrow(NotExistError)
    })

    test('should delete a sealed secret', () => {
      const createdSecret = service.createSealedSecret(secret)

      service.deleteSealedSecret(createdSecret.metadata.name)
      expect(service.getSealedSecrets()).toHaveLength(0)
    })
  })

  describe('Backups', () => {
    const backup: AplBackupRequest = {
      kind: 'AplTeamBackup',
      metadata: { name: 'TestBackup' },
      spec: { ttl: '1', schedule: '0 0 * * *' },
    }

    test('should create a backup', () => {
      const created = service.createBackup(backup)
      expect(created).toEqual({
        kind: 'AplTeamBackup',
        metadata: {
          name: 'TestBackup',
          labels: {
            'apl.io/teamId': 'team1',
          },
        },
        spec: { ttl: '1', schedule: '0 0 * * *' },
        status: {},
      })
      expect(service.getBackup(created.metadata.name)).toEqual(created)
    })

    test('should throw an error when creating duplicate backup', () => {
      service.createBackup(backup)
      expect(() => service.createBackup(backup)).toThrow(AlreadyExists)
    })

    test('should delete a backup', () => {
      const created = service.createBackup(backup)
      service.deleteBackup(created.metadata.name)
      expect(() => service.getBackup(created.metadata.name)).toThrow(NotExistError)
    })
  })

  describe('Projects', () => {
    const project: AplProjectRequest = {
      kind: 'AplTeamProject',
      metadata: { name: 'TestProject' },
      spec: {},
    }

    test('should create a project', () => {
      const created = service.createProject(project)
      expect(created).toEqual({
        kind: 'AplTeamProject',
        metadata: {
          name: 'TestProject',
          labels: {
            'apl.io/teamId': 'team1',
          },
        },
        spec: { name: 'TestProject' },
        status: {},
      })
      expect(service.getProject(created.metadata.name)).toEqual(created)
    })

    test('should throw an error when creating duplicate project', () => {
      service.createProject(project)
      expect(() => service.createProject(project)).toThrow(AlreadyExists)
    })

    test('should delete a project', () => {
      const created = service.createProject(project)
      service.deleteProject(created.metadata.name)
      expect(() => service.getProject(created.metadata.name)).toThrow(NotExistError)
    })
  })

  describe('Netpols', () => {
    const netpol: AplNetpolRequest = {
      kind: 'AplTeamNetworkControl',
      metadata: { name: 'TestNetpol' },
      spec: {},
    }

    test('should create a netpol', () => {
      const created = service.createNetpol(netpol)
      expect(created).toEqual({
        kind: 'AplTeamNetworkControl',
        metadata: {
          name: 'TestNetpol',
          labels: {
            'apl.io/teamId': 'team1',
          },
        },
        spec: {},
        status: {},
      })
      expect(service.getNetpol(created.metadata.name)).toEqual(created)
    })

    test('should throw an error when creating duplicate netpol', () => {
      service.createNetpol(netpol)
      expect(() => service.createNetpol(netpol)).toThrow(AlreadyExists)
    })

    test('should delete a netpol', () => {
      const created = service.createNetpol(netpol)
      service.deleteNetpol(created.metadata.name)
      expect(() => service.getNetpol(created.metadata.name)).toThrow(NotExistError)
    })
  })

  describe('Apps', () => {
    const app: App = { id: 'app1' }

    test('should create an app', () => {
      const created = service.createApp(app)
      expect(created).toEqual({ id: 'app1' })
      expect(service.getApp(created.id)).toEqual(created)
    })

    test('should throw an error when creating duplicate app', () => {
      service.createApp(app)
      expect(() => service.createApp(app)).toThrow(AlreadyExists)
    })
  })

  describe('Policies', () => {
    test('should retrieve policies', () => {
      expect(service.getPolicies()).toEqual([])
    })

    test('should update policies', () => {
      service.patchPolicies('require-limits', {
        spec: { action: 'Audit', severity: 'medium' },
      })
      expect(service.getPolicies()).toEqual([
        {
          kind: 'AplTeamPolicy',
          metadata: {
            name: 'require-limits',
            labels: {
              'apl.io/teamId': 'team1',
            },
          },
          spec: {
            action: 'Audit',
            severity: 'medium',
          },
          status: {},
        },
      ])
    })

    test('should retrieve a single policy', () => {
      service.updatePolicies('require-limits', {
        kind: 'AplTeamPolicy',
        metadata: { name: 'require-limits' },
        spec: { action: 'Audit', severity: 'medium' },
      })
      expect(service.getPolicy('require-limits')).toEqual({
        kind: 'AplTeamPolicy',
        metadata: {
          name: 'require-limits',
          labels: {
            'apl.io/teamId': 'team1',
          },
        },
        spec: { action: 'Audit', severity: 'medium' },
        status: {},
      })
    })
  })

  describe('Settings', () => {
    test('should retrieve settings', () => {
      expect(service.getSettings()).toEqual({
        kind: 'AplTeamSettingSet',
        metadata: {
          labels: {
            'apl.io/teamId': 'team1',
          },
          name: 'team1',
        },
        spec: {},
        status: {},
      })
    })

    test('should update settings', () => {
      const updated = service.updateSettings({
        kind: 'AplTeamSettingSet',
        metadata: { name: 'team1' },
        spec: { networkPolicy: { egressPublic: true } },
      })
      expect(updated).toEqual({
        kind: 'AplTeamSettingSet',
        metadata: {
          labels: {
            'apl.io/teamId': 'team1',
          },
          name: 'team1',
        },
        spec: {
          networkPolicy: {
            egressPublic: true,
          },
        },
        status: {},
      })
      expect(service.getSettings().spec.networkPolicy!.egressPublic).toBe(true)
    })
  })

  describe('doesProjectNameExist', () => {
    test('should return false when no projects exist', () => {
      expect(service.doesProjectNameExist('NonExistentProject')).toBe(false)
    })

    test('should return true when a build with the given name exists', () => {
      service.createBuild({
        kind: 'AplTeamBuild',
        metadata: { name: 'ExistingBuild' },
        spec: {},
      })
      expect(service.doesProjectNameExist('ExistingBuild')).toBe(true)
    })

    test('should return true when a workload with the given name exists', () => {
      service.createWorkload({
        kind: 'AplTeamWorkload',
        metadata: { name: 'ExistingWorkload' },
        spec: {
          url: 'http://example.com',
          values: '',
        },
      })
      expect(service.doesProjectNameExist('ExistingWorkload')).toBe(true)
    })

    test('should return true when a service with the given name exists', () => {
      service.createService({
        kind: 'AplTeamService',
        metadata: { name: 'ExistingService' },
        spec: {},
      })
      expect(service.doesProjectNameExist('ExistingService')).toBe(true)
    })

    test('should return false when the name does not match any existing project', () => {
      service.createBuild({
        kind: 'AplTeamBuild',
        metadata: { name: 'SomeBuild' },
        spec: {},
      })
      service.createWorkload({
        kind: 'AplTeamWorkload',
        metadata: { name: 'SomeWorkload' },
        spec: { url: 'http://example.com', values: '' },
      })
      service.createService({
        kind: 'AplTeamService',
        metadata: { name: 'SomeService' },
        spec: {},
      })
      expect(service.doesProjectNameExist('NonExistentProject')).toBe(false)
    })
  })

  describe('getCollection', () => {
    test('should retrieve an existing collection', () => {
      service.getSettings().metadata.name = 'team1'
      service.createBuild({ kind: 'AplTeamBuild', metadata: { name: 'TestBuild' }, spec: {} })
      expect(service.getCollection('builds')).toEqual([
        {
          kind: 'AplTeamBuild',
          metadata: {
            name: 'TestBuild',
            labels: {
              'apl.io/teamId': 'team1',
            },
          },
          spec: {},
          status: {},
        },
      ])
    })

    test('should throw an error when trying to retrieve a non-existent collection', () => {
      expect(() => service.getCollection('nonExistentCollection')).toThrowError(
        'Getting TeamConfig collection [nonExistentCollection] does not exist.',
      )
    })
  })

  describe('updateCollection', () => {
    test('should update an existing collection', () => {
      service.createBuild({ kind: 'AplTeamBuild', metadata: { name: 'Build1' }, spec: {} })
      service.updateCollection('builds', [{ kind: 'AplTeamBuild', metadata: { name: 'UpdatedBuild' } }])
      expect(service.getCollection('builds')).toEqual([{ kind: 'AplTeamBuild', metadata: { name: 'UpdatedBuild' } }])
    })

    test('should create a new collection if it does not exist', () => {
      service.updateCollection('customCollection', [{ key: 'value' }])
      expect(service.getCollection('customCollection')).toEqual([{ key: 'value' }])
    })
  })
})
