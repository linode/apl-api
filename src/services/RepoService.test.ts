import { AlreadyExists } from '../error'
import { AplTeamSettingsRequest, App, Repo, User } from '../otomi-models'
import { RepoService } from './RepoService'
import { TeamConfigService } from './TeamConfigService'

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}))

describe('RepoService', () => {
  let service: RepoService
  let repo: Repo
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
  } as AplTeamSettingsRequest

  beforeEach(() => {
    repo = {
      apps: [],
      users: [],
      teamConfig: {},
      cluster: { name: 'Test Cluster', provider: 'linode' },
      dns: {},
      ingress: {},
      otomi: { version: '1.0.0' },
      smtp: { smarthost: 'smtp.mailtrap.io' },
      platformBackups: {},
      alerts: {},
      databases: {},
      kms: {},
      obj: {},
      oidc: { issuer: 'https://issuer.com', clientID: 'client-id', clientSecret: 'client-secret' },
      versions: { version: '1.0.0' },
      files: {},
    } as Repo
    service = new RepoService(repo)
    service.createTeamConfig(teamSettings)
  })

  describe('getTeamConfigService', () => {
    test('should throw an error if team config does not exist', () => {
      expect(() => service.getTeamConfigService('nonexistent-team')).toThrow(
        'TeamConfig for nonexistent-team does not exist.',
      )
    })

    test('should return an instance of TeamConfigService when team config exists', () => {
      const teamConfigService = service.getTeamConfigService('team1')

      expect(teamConfigService).toBeInstanceOf(TeamConfigService)
      expect(service.getTeamConfig('team1')).toBeDefined()
    })
  })

  describe('Users', () => {
    const user: User = { email: 'user@test.com', firstName: 'user', lastName: 'test' }

    test('should create a user', () => {
      const createdUser = service.createUser(user)
      expect(createdUser).toEqual({ email: 'user@test.com', id: 'mocked-uuid', firstName: 'user', lastName: 'test' })
      expect(service.getUsers()).toHaveLength(1)
    })

    test('should throw an error if user already exists', () => {
      service.createUser(user)
      expect(() => service.createUser(user)).toThrow(AlreadyExists)
    })

    test('should retrieve a user by ID', () => {
      const createdUser = service.createUser(user)
      expect(service.getUser(createdUser.id!)).toEqual(createdUser)
    })

    test('should delete a user', () => {
      const createdUser = service.createUser(user)
      service.deleteUser(createdUser.email)
      expect(service.getUsers()).toHaveLength(0)
    })
  })

  describe('Apps', () => {
    const app: App = { id: 'app1', enabled: true }

    test('should retrieve all apps', () => {
      service.getRepo().apps.push(app)
      expect(service.getApps()).toContain(app)
    })

    test('should retrieve a specific app', () => {
      service.getRepo().apps.push(app)
      expect(service.getApp('app1')).toEqual(app)
    })

    test('should throw an error when retrieving a non-existent app', () => {
      expect(() => service.getApp('nonexistent')).toThrow('App[nonexistent] does not exist.')
    })

    test('should update an app', () => {
      service.getRepo().apps.push(app)
      const updatedApp = service.updateApp('app1', { enabled: false })
      expect(updatedApp.enabled).toBe(false)
    })

    test('should delete an app', () => {
      service.getRepo().apps.push(app)
      service.deleteApp('app1')
      expect(service.getApps()).toHaveLength(0)
    })
  })

  describe('Team Config', () => {
    test('should create a team config', () => {
      const teamConfig = service.getTeamConfig('team1')
      expect(teamConfig?.settings).toEqual({
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
      expect(service.getTeamConfig('team1')).toBeDefined()
    })

    test('should throw an error if team config already exists', () => {
      expect(() => service.createTeamConfig(teamSettings)).toThrow(AlreadyExists)
    })

    test('should delete a team config', () => {
      service.deleteTeamConfig('team1')
      expect(service.getTeamConfig('team1')).toBeUndefined()
    })
  })

  describe('Collection Functions', () => {
    test('should retrieve a collection', () => {
      service.getRepo().cluster = { name: 'Test Cluster', provider: 'linode' }
      expect(service.getCollection('cluster')).toEqual({ name: 'Test Cluster', provider: 'linode' })
    })

    test('should throw an error for non-existent collection', () => {
      expect(() => service.getCollection('nonexistent')).toThrow(
        'Getting repo collection [nonexistent] does not exist.',
      )
    })

    test('should update an existing collection', () => {
      service.getRepo().cluster = { name: 'Old Cluster', provider: 'linode' }
      service.updateCollection('cluster', { name: 'Updated Cluster' })
      expect(service.getCollection('cluster')).toEqual({ name: 'Updated Cluster' })
    })

    test('should throw an error when updating a non-existent collection', () => {
      expect(() => service.updateCollection('nonexistent', { key: 'value' })).toThrow(
        'Updating repo collection [nonexistent] does not exist.',
      )
    })
  })

  describe('Settings', () => {
    test('should retrieve settings', () => {
      service.getRepo().cluster = { name: 'Cluster A', provider: 'linode' }
      service.getRepo().dns = { provider: { linode: { apiToken: 'test' } } }
      const settings = service.getSettings()

      expect(settings.cluster).toEqual({ name: 'Cluster A', provider: 'linode' })
      expect(settings.dns).toEqual({ provider: { linode: { apiToken: 'test' } } })
    })

    test('should update settings', () => {
      service.updateSettings({ cluster: { name: 'Updated Cluster', provider: 'linode' } })
      expect(service.getSettings().cluster).toEqual({ name: 'Updated Cluster', provider: 'linode' })
    })
  })

  describe('Global Retrieval Functions', () => {
    test('should return all users emails', () => {
      service.createUser({ email: 'user1@test.com', firstName: 'user', lastName: 'test' })
      service.createUser({ email: 'user2@test.com', firstName: 'user', lastName: 'test' })
      expect(service.getUsersEmail()).toEqual(['user1@test.com', 'user2@test.com'])
    })

    test('should return all builds', () => {
      service.getTeamConfigService('team1').createBuild({
        kind: 'AplTeamBuild',
        metadata: { name: 'Build1' },
        spec: {},
      })
      expect(service.getAllBuilds()).toHaveLength(1)
    })
  })
})
