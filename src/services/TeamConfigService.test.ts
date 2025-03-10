// Mock UUID to generate predictable values
import {
  App,
  Backup,
  Build,
  Netpol,
  Project,
  SealedSecret,
  Service,
  TeamConfig,
  Workload,
  WorkloadValues,
} from '../otomi-models'
import { TeamConfigService } from './TeamConfigService'
import { AlreadyExists, NotExistError } from '../error'

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}))

describe('TeamConfigService', () => {
  let service: TeamConfigService
  let teamConfig: TeamConfig

  beforeEach(() => {
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
      policies: {},
      settings: { name: 'team1' },
    } as TeamConfig
    service = new TeamConfigService(teamConfig)
  })

  describe('Builds', () => {
    const build: Build = { name: 'TestBuild' }
    test('should create a build', () => {
      const createdBuild = service.createBuild(build)

      expect(createdBuild).toEqual({ name: 'TestBuild', id: 'mocked-uuid' })
      expect(service.getBuilds()).toHaveLength(1)
    })

    test('should throw an error if creating a duplicate build', () => {
      service.createBuild(build)

      expect(() => service.createBuild(build)).toThrow(AlreadyExists)
    })

    test('should retrieve a build by id', () => {
      const createdBuild = service.createBuild(build)

      expect(service.getBuild(createdBuild.name)).toEqual(createdBuild)
    })

    test('should throw an error when retrieving a non-existent build', () => {
      expect(() => service.getBuild('non-existent')).toThrow(NotExistError)
    })

    test('should update a build', () => {
      const createdBuild = service.createBuild(build)

      const updatedBuild = service.updateBuild(createdBuild.name, { name: 'UpdatedBuild' })
      expect(updatedBuild.name).toBe('UpdatedBuild')
    })

    test('should delete a build', () => {
      const createdBuild = service.createBuild(build)

      service.deleteBuild(createdBuild.name)
      expect(service.getBuilds()).toHaveLength(0)
    })
  })

  describe('Workloads', () => {
    const workload: Workload = { name: 'TestWorkload', url: 'http://test.com' }
    test('should create a workload', () => {
      const createdWorkload = service.createWorkload(workload)

      expect(createdWorkload).toEqual({ name: 'TestWorkload', id: 'mocked-uuid', url: 'http://test.com' })
      expect(service.getWorkloads()).toHaveLength(1)
    })

    test('should throw an error if creating a duplicate workload', () => {
      service.createWorkload(workload)

      expect(() => service.createWorkload(workload)).toThrow(AlreadyExists)
    })

    test('should retrieve a workload by id', () => {
      const createdWorkload = service.createWorkload(workload)

      expect(service.getWorkload(createdWorkload.name)).toEqual(createdWorkload)
    })

    test('should throw an error when retrieving a non-existent workload', () => {
      expect(() => service.getWorkload('non-existent')).toThrow(NotExistError)
    })

    test('should delete a workload', () => {
      const createdWorkload = service.createWorkload(workload)

      service.deleteWorkload(createdWorkload.name)
      expect(service.getWorkloads()).toHaveLength(0)
    })
  })

  describe('Services', () => {
    const serviceData: Service = { name: 'TestService', ingress: {} }
    test('should create a service', () => {
      const createdService = service.createService(serviceData)

      expect(createdService).toEqual({ name: 'TestService', id: 'mocked-uuid', ingress: {} })
      expect(service.getServices()).toHaveLength(1)
    })

    test('should throw an error if creating a duplicate service', () => {
      service.createService(serviceData)

      expect(() => service.createService(serviceData)).toThrow(AlreadyExists)
    })

    test('should retrieve a service by id', () => {
      const createdService = service.createService(serviceData)

      expect(service.getService(createdService.name)).toEqual(createdService)
    })

    test('should throw an error when retrieving a non-existent service', () => {
      expect(() => service.getService('non-existent')).toThrow(NotExistError)
    })

    test('should delete a service', () => {
      const createdService = service.createService(serviceData)

      service.deleteService(createdService.name)
      expect(service.getServices()).toHaveLength(0)
    })
  })

  describe('SealedSecrets', () => {
    const secret: SealedSecret = {
      name: 'TestSecret',
      type: 'kubernetes.io/opaque',
      encryptedData: [{ key: 'key', value: 'value' }],
    }
    test('should create a sealed secret', () => {
      const createdSecret = service.createSealedSecret(secret)

      expect(createdSecret).toEqual({
        name: 'TestSecret',
        id: 'mocked-uuid',
        type: 'kubernetes.io/opaque',
        encryptedData: [{ key: 'key', value: 'value' }],
      })
      expect(service.getSealedSecrets()).toHaveLength(1)
    })

    test('should throw an error if creating a duplicate sealed secret', () => {
      service.createSealedSecret(secret)

      expect(() => service.createSealedSecret(secret)).toThrow(AlreadyExists)
    })

    test('should retrieve a sealed secret by id', () => {
      const createdSecret = service.createSealedSecret(secret)

      expect(service.getSealedSecret(createdSecret.name)).toEqual(createdSecret)
    })

    test('should throw an error when retrieving a non-existent sealed secret', () => {
      expect(() => service.getSealedSecret('non-existent')).toThrow(NotExistError)
    })

    test('should delete a sealed secret', () => {
      const createdSecret = service.createSealedSecret(secret)

      service.deleteSealedSecret(createdSecret.name)
      expect(service.getSealedSecrets()).toHaveLength(0)
    })
  })

  describe('WorkloadValues', () => {
    const workloadValues: WorkloadValues = { name: 'TestWorkloadValues', values: { test: 'values' } }

    test('should create workload values', () => {
      const created = service.createWorkloadValues(workloadValues)
      expect(created).toEqual({ name: 'TestWorkloadValues', id: 'mocked-uuid', values: { test: 'values' } })
      expect(service.getWorkloadValues(created.name!)).toEqual(created)
    })

    test('should throw an error when creating duplicate workload values', () => {
      service.createWorkloadValues(workloadValues)
      expect(() => service.createWorkloadValues(workloadValues)).toThrow(AlreadyExists)
    })

    test('should delete workload values', () => {
      const created = service.createWorkloadValues(workloadValues)
      service.deleteWorkloadValues(created.name!)
      expect(() => service.getWorkloadValues(created.name!)).toThrow(NotExistError)
    })
  })

  describe('Backups', () => {
    const backup: Backup = { name: 'TestBackup', ttl: '1', schedule: '0 0 * * *' }

    test('should create a backup', () => {
      const created = service.createBackup(backup)
      expect(created).toEqual({ name: 'TestBackup', id: 'mocked-uuid', ttl: '1', schedule: '0 0 * * *' })
      expect(service.getBackup(created.name)).toEqual(created)
    })

    test('should throw an error when creating duplicate backup', () => {
      service.createBackup(backup)
      expect(() => service.createBackup(backup)).toThrow(AlreadyExists)
    })

    test('should delete a backup', () => {
      const created = service.createBackup(backup)
      service.deleteBackup(created.name)
      expect(() => service.getBackup(created.name)).toThrow(NotExistError)
    })
  })

  describe('Projects', () => {
    const project: Project = { name: 'TestProject' }

    test('should create a project', () => {
      const created = service.createProject(project)
      expect(created).toEqual({ name: 'TestProject', id: 'mocked-uuid' })
      expect(service.getProject(created.name)).toEqual(created)
    })

    test('should throw an error when creating duplicate project', () => {
      service.createProject(project)
      expect(() => service.createProject(project)).toThrow(AlreadyExists)
    })

    test('should delete a project', () => {
      const created = service.createProject(project)
      service.deleteProject(created.name)
      expect(() => service.getProject(created.name)).toThrow(NotExistError)
    })
  })

  describe('Netpols', () => {
    const netpol: Netpol = { name: 'TestNetpol' }

    test('should create a netpol', () => {
      const created = service.createNetpol(netpol)
      expect(created).toEqual({ name: 'TestNetpol', id: 'mocked-uuid' })
      expect(service.getNetpol(created.name)).toEqual(created)
    })

    test('should throw an error when creating duplicate netpol', () => {
      service.createNetpol(netpol)
      expect(() => service.createNetpol(netpol)).toThrow(AlreadyExists)
    })

    test('should delete a netpol', () => {
      const created = service.createNetpol(netpol)
      service.deleteNetpol(created.name)
      expect(() => service.getNetpol(created.name)).toThrow(NotExistError)
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
      expect(service.getPolicies()).toEqual({})
    })

    test('should update policies', () => {
      service.updatePolicies({ 'require-limits': { action: 'Audit' } })
      expect(service.getPolicies()).toEqual({ 'require-limits': { action: 'Audit' } })
    })

    test('should retrieve a single policy', () => {
      service.updatePolicies({ 'require-limits': { action: 'Audit' } })
      expect(service.getPolicy('require-limits')).toEqual({ action: 'Audit' })
    })
  })

  describe('Settings', () => {
    test('should retrieve settings', () => {
      expect(service.getSettings()).toEqual({ name: 'team1' })
    })

    test('should update settings', () => {
      const updated = service.updateSettings({ name: 'UpdatedTeam' })
      expect(updated).toEqual({ name: 'UpdatedTeam' })
      expect(service.getSettings().name).toBe('UpdatedTeam')
    })
  })

  describe('doesProjectNameExist', () => {
    test('should return false when no projects exist', () => {
      expect(service.doesProjectNameExist('NonExistentProject')).toBe(false)
    })

    test('should return true when a build with the given name exists', () => {
      service.createBuild({ name: 'ExistingBuild' })
      expect(service.doesProjectNameExist('ExistingBuild')).toBe(true)
    })

    test('should return true when a workload with the given name exists', () => {
      service.createWorkload({ name: 'ExistingWorkload', url: 'http://example.com' })
      expect(service.doesProjectNameExist('ExistingWorkload')).toBe(true)
    })

    test('should return true when a service with the given name exists', () => {
      service.createService({ name: 'ExistingService', ingress: {} })
      expect(service.doesProjectNameExist('ExistingService')).toBe(true)
    })

    test('should return false when the name does not match any existing project', () => {
      service.createBuild({ name: 'SomeBuild' })
      service.createWorkload({ name: 'SomeWorkload', url: 'http://example.com' })
      service.createService({ name: 'SomeService', ingress: {} })
      expect(service.doesProjectNameExist('NonExistentProject')).toBe(false)
    })
  })

  describe('getCollection', () => {
    test('should retrieve an existing collection', () => {
      service.getSettings().id = 'team-id'
      service.createBuild({ name: 'TestBuild' })
      expect(service.getCollection('builds')).toEqual([
        {
          kind: 'AplTeamBuild',
          metadata: {
            name: 'TestBuild',
            labels: {
              'apl.io/id': expect.any(String),
              'apl.io/teamId': 'team-id',
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
      service.createBuild({ name: 'Build1' })
      service.updateCollection('builds', [{ name: 'UpdatedBuild' }])
      expect(service.getCollection('builds')).toEqual([{ name: 'UpdatedBuild' }])
    })

    test('should create a new collection if it does not exist', () => {
      service.updateCollection('customCollection', [{ key: 'value' }])
      expect(service.getCollection('customCollection')).toEqual([{ key: 'value' }])
    })

    test('should replace the collection with the new value', () => {
      service.createBuild({ name: 'OldBuild' })
      service.updateCollection('builds', [{ name: 'NewBuild' }])
      expect(service.getCollection('builds')).toEqual([{ name: 'NewBuild' }])
    })
  })
})
