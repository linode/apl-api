import { mockDeep } from 'jest-mock-extended'
import {
  AplCodeRepoResponse,
  AplServiceRequest,
  AplTeamSettingsRequest,
  App,
  SessionUser,
  User,
} from 'src/otomi-models'
import OtomiStack from 'src/otomi-stack'
import { loadSpec } from './app'
import { NotExistError, ValidationError } from './error'
import { Git } from './git'

jest.mock('./tty', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    createTty: jest.fn(),
    deleteTty: jest.fn(),
  })),
}))

jest.mock('src/middleware', () => ({
  ...jest.requireActual('src/middleware'),
  getSessionStack: jest.fn(),
}))

jest.mock('src/utils', () => {
  const originalModule = jest.requireActual('src/utils')

  return {
    __esModule: true,
    ...originalModule,
    getServiceUrl: jest.fn().mockResolvedValue({ subdomain: '', domain: 'test' }),
    getValuesSchema: jest.fn().mockResolvedValue({}),
  }
})

jest.mock('src/utils/userUtils', () => {
  const originalModule = jest.requireActual('src/utils/userUtils')

  return {
    __esModule: true,
    ...originalModule,
    getKeycloakUsers: jest.fn().mockResolvedValue([]),
  }
})

const mockListUserSecretsFromK8s = jest.fn().mockResolvedValue([])
const mockGetUserSecretFromK8s = jest.fn().mockResolvedValue(undefined)
jest.mock('./k8s-operations', () => {
  const originalModule = jest.requireActual('./k8s-operations')
  return {
    __esModule: true,
    ...originalModule,
    listUserSecretsFromK8s: (...args: any[]) => mockListUserSecretsFromK8s(...args),
    getUserSecretFromK8s: (...args: any[]) => mockGetUserSecretFromK8s(...args),
    getSecretValues: jest.fn().mockResolvedValue({ adminPassword: 'test-admin-password' }),
  }
})

jest.mock('./utils/sealedSecretUtils', () => {
  const originalModule = jest.requireActual('./utils/sealedSecretUtils')
  return {
    __esModule: true,
    ...originalModule,
    createPlatformSealedSecretManifest: jest.fn().mockResolvedValue('mock-sealed-secret-yaml'),
    createUserSealedSecret: jest.fn().mockResolvedValue('mock-user-sealed-secret-yaml'),
  }
})

beforeAll(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'debug').mockImplementation(() => {})
  jest.spyOn(console, 'info').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})

  await loadSpec()
})

// Track users created in tests for K8s mock
const testK8sUsers: any[] = []

beforeEach(() => {
  testK8sUsers.length = 0
  mockListUserSecretsFromK8s.mockResolvedValue([])
  mockGetUserSecretFromK8s.mockResolvedValue(undefined)
})

// Helper functions for FileStore-based tests
function createTestUser(otomiStack: OtomiStack, user: User): void {
  const { buildPlatformObject } = require('./otomi-models')
  const aplUser = buildPlatformObject('AplUser', user.id!, user as any)
  otomiStack.fileStore.setPlatformResource(aplUser)

  // Also register in K8s mock for getAllUsers/getUser
  const k8sUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    initialPassword: user.initialPassword || '',
    isPlatformAdmin: user.isPlatformAdmin || false,
    isTeamAdmin: user.isTeamAdmin || false,
    teams: user.teams || [],
  }
  testK8sUsers.push(k8sUser)
  mockListUserSecretsFromK8s.mockResolvedValue([...testK8sUsers])
  mockGetUserSecretFromK8s.mockImplementation((id: string) => {
    const found = testK8sUsers.find((u) => u.id === id)
    return Promise.resolve(found || undefined)
  })
}

function createTestTeam(otomiStack: OtomiStack, teamId: string, spec: any = {}): void {
  const teamSettings: AplTeamSettingsRequest = {
    kind: 'AplTeamSettingSet',
    metadata: {
      name: teamId,
      labels: {
        'apl.io/teamId': teamId,
      },
    },
    spec,
  }
  otomiStack.fileStore.setTeamResource(teamSettings)
}

function createTestService(otomiStack: OtomiStack, teamId: string, name: string, spec: any): void {
  const service: AplServiceRequest & { metadata: { labels: { 'apl.io/teamId': string } } } = {
    kind: 'AplTeamService',
    metadata: {
      name,
      labels: {
        'apl.io/teamId': teamId,
      },
    },
    spec,
  }
  otomiStack.fileStore.setTeamResource(service)
}

describe('Data validation', () => {
  let otomiStack: OtomiStack
  const teamId = 'team-1'
  let mockGit: jest.Mocked<Git>

  beforeEach(async () => {
    otomiStack = new OtomiStack()
    await otomiStack.init()

    // Initialize FileStore
    const { FileStore } = require('./fileStore/file-store')
    otomiStack.fileStore = new FileStore()

    // Mock Git operations
    mockGit = mockDeep<Git>()
    otomiStack.git = mockGit

    // Pre-populate FileStore with test services for duplicate URL tests
    createTestService(otomiStack, teamId, 'svc1', { domain: 'b.a.com' })
    createTestService(otomiStack, teamId, 'svc2', { domain: 'b.a.com', paths: ['/test/'] })

    jest.spyOn(otomiStack, 'doDeleteDeployment').mockResolvedValue()
    jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()
  })

  test('should create a password when password is not specified', async () => {
    await otomiStack.createAplTeam({
      metadata: {
        name: 'test',
        labels: {
          'apl.io/teamId': 'test',
        },
      },
      spec: {},
      kind: 'AplTeamSettingSet',
    })

    const teamSettings = otomiStack.fileStore.getTeamResource('AplTeamSettingSet', 'test', 'settings')

    expect(teamSettings).toBeDefined()
    expect(teamSettings?.spec.password).toBeUndefined()

    expect(mockGit.writeFile).toHaveBeenCalled()
    expect(mockGit.writeTextFile).toHaveBeenCalled()
  })

  test('should not create a password when password is specified', async () => {
    await otomiStack.createAplTeam({
      metadata: {
        name: 'test',
        labels: {
          'apl.io/teamId': 'test',
        },
      },
      spec: {},
      kind: 'AplTeamSettingSet',
    })

    const teamSettings = otomiStack.fileStore.getTeamResource('AplTeamSettingSet', 'test', 'settings')

    expect(teamSettings).toBeDefined()
    expect(teamSettings?.spec.password).toBeUndefined()

    expect(mockGit.writeTextFile).toHaveBeenCalled()
  })

  test('should throw ValidationError when team name is under 3 characters', async () => {
    const teamData: AplTeamSettingsRequest = {
      kind: 'AplTeamSettingSet',
      metadata: {
        name: 'ab',
        labels: {
          'apl.io/teamId': 'ab',
        },
      },
      spec: {},
    }

    await expect(otomiStack.createAplTeam(teamData)).rejects.toThrow(
      new ValidationError('Team name must be at least 3 characters long'),
    )
  })

  test('should throw ValidationError when team name exceeds 9 characters', async () => {
    const teamData: AplTeamSettingsRequest = {
      kind: 'AplTeamSettingSet',
      metadata: {
        name: 'verylongteamname',
        labels: {
          'apl.io/teamId': 'verylongteamname',
        },
      },
      spec: {},
    }

    await expect(otomiStack.createAplTeam(teamData)).rejects.toThrow(
      new ValidationError('Team name must not exceed 9 characters'),
    )
  })

  test('should not throw ValidationError when team name is exactly 9 characters', async () => {
    const teamData: AplTeamSettingsRequest = {
      kind: 'AplTeamSettingSet',
      metadata: {
        name: 'ninechars',
        labels: {
          'apl.io/teamId': 'ninechars',
        },
      },
      spec: {},
    }

    await expect(otomiStack.createAplTeam(teamData)).resolves.not.toThrow()

    // Verify team was created in FileStore
    const teamSettings = otomiStack.fileStore.getTeamResource('AplTeamSettingSet', 'ninechars', 'settings')
    expect(teamSettings).toBeDefined()
    expect(teamSettings?.metadata.name).toBe('ninechars')
  })

  test('should not throw ValidationError when team name is less than 9 characters', async () => {
    const teamData: AplTeamSettingsRequest = {
      kind: 'AplTeamSettingSet',
      metadata: {
        name: 'short',
        labels: {
          'apl.io/teamId': 'short',
        },
      },
      spec: {},
    }

    await expect(otomiStack.createAplTeam(teamData)).resolves.not.toThrow()

    // Verify team was created in FileStore
    const teamSettings = otomiStack.fileStore.getTeamResource('AplTeamSettingSet', 'short', 'settings')
    expect(teamSettings).toBeDefined()
    expect(teamSettings?.metadata.name).toBe('short')
  })
})

describe('Work with values', () => {
  let otomiStack: OtomiStack
  beforeEach(async () => {
    otomiStack = new OtomiStack()

    await otomiStack.init()
    otomiStack.git = new Git('./test', undefined, 'someuser', 'some@ema.il', '', 'main')
    jest.spyOn(otomiStack, 'doDeleteDeployment').mockResolvedValue()
    jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()
  })

  test('can load from configuration to database and back', async () => {
    await expect(otomiStack.loadValues()).resolves.not.toThrow()
  })
})

describe('Workload values', () => {
  let otomiStack: OtomiStack
  beforeEach(async () => {
    otomiStack = new OtomiStack()
    await otomiStack.init()
    otomiStack.git = new Git('./test', undefined, 'someuser', 'some@ema.il', '', 'main')
    jest.spyOn(otomiStack, 'doDeleteDeployment').mockResolvedValue()
    jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()
  })

  test('returns filtered apps if App array is submitted isPreinstalled flag is true', async () => {
    const apps: App[] = [{ id: 'external-dns' }, { id: 'cnpg' }, { id: 'loki' }]
    jest.spyOn(otomiStack, 'getSettingsInfo').mockResolvedValue({ otomi: { isPreInstalled: true } })
    const filteredApps = await otomiStack.filterExcludedApp(apps)
    expect(filteredApps).toEqual([{ id: 'cnpg' }, { id: 'loki' }])
  })

  test('returns app with managed = true if single App is in excludedList and isPreinstalled flag is true', async () => {
    const app: App = { id: 'external-dns' }
    jest.spyOn(otomiStack, 'getSettingsInfo').mockResolvedValue({ otomi: { isPreInstalled: true } })
    const filteredApp = await otomiStack.filterExcludedApp(app)
    expect(filteredApp).toEqual({ id: 'external-dns', managed: true })
  })
})

describe('Users tests', () => {
  let otomiStack: OtomiStack
  let mockGit: jest.Mocked<Git>

  const domainSuffix = 'dev.linode-apl.net'

  const platformAdminSession: SessionUser = {
    name: 'Platform Admin',
    email: `platform-admin@${domainSuffix}`,
    isPlatformAdmin: true,
    isTeamAdmin: false,
    authz: {},
    teams: [],
    roles: [],
    sub: 'platform-admin',
  }
  const teamAdminSession: SessionUser = {
    name: 'Team Admin',
    email: `team-admin@${domainSuffix}`,
    isPlatformAdmin: false,
    isTeamAdmin: true,
    authz: {},
    teams: ['team1'],
    roles: [],
    sub: 'team-admin',
  }
  const sessionUser: SessionUser = {
    name: 'Session User',
    email: `session@${domainSuffix}`,
    isPlatformAdmin: false,
    isTeamAdmin: false,
    authz: {},
    teams: [],
    roles: [],
    sub: 'session-user',
  }
  const defaultPlatformAdmin: User = {
    id: '1',
    email: `platform-admin@${domainSuffix}`,
    firstName: 'platform',
    lastName: 'admin',
    isPlatformAdmin: true,
    isTeamAdmin: false,
    teams: [],
  }
  const anyPlatformAdmin: User = {
    id: '2',
    email: `any-admin@${domainSuffix}`,
    firstName: 'any',
    lastName: 'admin',
    isPlatformAdmin: true,
    isTeamAdmin: false,
    teams: [],
  }
  const teamAdmin: User = {
    id: '3',
    email: `team-admin@${domainSuffix}`,
    firstName: 'team',
    lastName: 'admin',
    isPlatformAdmin: false,
    isTeamAdmin: true,
    teams: [],
  }
  const teamMember1: User = {
    id: '4',
    email: `team-member1@${domainSuffix}`,
    firstName: 'team1',
    lastName: 'member1',
    isPlatformAdmin: false,
    isTeamAdmin: false,
    teams: [],
  }
  const teamMember2: User = {
    id: '5',
    email: `team-member2@${domainSuffix}`,
    firstName: 'team2',
    lastName: 'member2',
    isPlatformAdmin: false,
    isTeamAdmin: false,
    teams: [],
  }

  beforeEach(async () => {
    otomiStack = new OtomiStack()
    await otomiStack.init()

    // Initialize FileStore
    const { FileStore } = require('./fileStore/file-store')
    otomiStack.fileStore = new FileStore()

    // Mock Git operations
    mockGit = mockDeep<Git>()
    otomiStack.git = mockGit

    // Mock getSessionStack to return this otomiStack instance
    const { getSessionStack } = require('src/middleware')
    jest.mocked(getSessionStack).mockResolvedValue(otomiStack)

    jest.spyOn(otomiStack, 'getSettings').mockResolvedValue({
      cluster: { name: 'default-cluster', domainSuffix, provider: 'linode' },
    })
    jest.spyOn(otomiStack, 'doDeleteDeployment').mockResolvedValue()
    jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()
    jest.spyOn(otomiStack, 'getApp').mockReturnValue({ id: 'keycloak' })

    // Pre-create platform admin users in FileStore
    createTestUser(otomiStack, defaultPlatformAdmin)
    createTestUser(otomiStack, anyPlatformAdmin)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('should not allow deleting the default platform admin user', async () => {
    await expect(otomiStack.deleteUser('1')).rejects.toMatchObject({
      code: 403,
      publicMessage: 'Cannot delete the default platform admin user',
    })
  })

  test('should allow deleting any other platform admin user', async () => {
    expect(await otomiStack.deleteUser('2')).toBeUndefined()
  })

  describe('User Retrieve Validation', () => {
    beforeEach(async () => {
      otomiStack = new OtomiStack()
      await otomiStack.init()

      // Initialize FileStore
      const { FileStore } = require('./fileStore/file-store')
      otomiStack.fileStore = new FileStore()

      mockGit = mockDeep<Git>()
      otomiStack.git = mockGit

      // Pre-create test user in FileStore
      createTestUser(otomiStack, teamMember1)
    })

    it('should return full user for platform admin', async () => {
      const result = await otomiStack.getUser(teamMember1.id!, platformAdminSession)
      expect(result).toMatchObject(teamMember1)
    })

    it('should return limited user info for team admin', async () => {
      const result = await otomiStack.getUser(teamMember1.id!, teamAdminSession)
      expect(result).toEqual({
        id: teamMember1.id,
        email: teamMember1.email,
        isPlatformAdmin: teamMember1.isPlatformAdmin,
        isTeamAdmin: teamMember1.isTeamAdmin,
        teams: teamMember1.teams,
      })
    })

    it('should throw 403 for regular user', async () => {
      try {
        await otomiStack.getUser(teamMember1.id!, { ...sessionUser, isPlatformAdmin: false, isTeamAdmin: false })
        fail('Expected error was not thrown')
      } catch (err: any) {
        expect(err).toHaveProperty('code', 403)
      }
    })

    it('should return all users for platform admin in getAllUsers', async () => {
      const users = await otomiStack.getAllUsers(platformAdminSession)
      expect(users.some((u) => u.id === teamMember1.id)).toBe(true)
    })

    it('should return limited info for team admin in getAllUsers', async () => {
      const users = await otomiStack.getAllUsers(teamAdminSession)
      expect(users[0]).toHaveProperty('id')
      expect(users[0]).toHaveProperty('email')
      expect(users[0]).toHaveProperty('isPlatformAdmin')
      expect(users[0]).toHaveProperty('isTeamAdmin')
      expect(users[0]).toHaveProperty('teams')
      // Should not have firstName/lastName
      expect(users[0]).not.toHaveProperty('firstName')
      expect(users[0]).not.toHaveProperty('lastName')
    })

    it('should throw 403 for regular user in getAllUsers', async () => {
      try {
        await otomiStack.getAllUsers({ ...sessionUser, isPlatformAdmin: false, isTeamAdmin: false })
        fail('Expected error was not thrown')
      } catch (err: any) {
        expect(err).toHaveProperty('code', 403)
      }
    })
  })

  describe('User Creation Validation', () => {
    describe('Username Length Validation', () => {
      it('should not create a user with less than 3 characters', async () => {
        await expect(otomiStack.createUser({ email: 'a@b.c', firstName: 'a', lastName: 'b' })).rejects.toMatchObject({
          code: 400,
          publicMessage: 'Username (the part of the email before "@") must be between 3 and 30 characters.',
        })
      })

      it('should not create a user with more than 30 characters', async () => {
        await expect(
          otomiStack.createUser({ email: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@b.c', firstName: 'a', lastName: 'b' }),
        ).rejects.toMatchObject({
          code: 400,
          publicMessage: 'Username (the part of the email before "@") must be between 3 and 30 characters.',
        })
      })
    })

    describe('Username Format Validation', () => {
      it('should not create a user if the username starts with non-alphanumeric characters', async () => {
        await expect(otomiStack.createUser({ email: '-abc@b.c', firstName: 'a', lastName: 'b' })).rejects.toMatchObject(
          {
            code: 400,
            publicMessage: 'Invalid username (the part of the email before "@") format.',
          },
        )
      })

      it('should not create a user if the username ends with non-alphanumeric characters', async () => {
        await expect(otomiStack.createUser({ email: 'abc-@b.c', firstName: 'a', lastName: 'b' })).rejects.toMatchObject(
          {
            code: 400,
            publicMessage: 'Invalid username (the part of the email before "@") format.',
          },
        )
      })

      it('should not create a user if the username includes consecutive non-alphanumeric characters', async () => {
        await expect(
          otomiStack.createUser({ email: 'ab--c@b.c', firstName: 'a', lastName: 'b' }),
        ).rejects.toMatchObject({
          code: 400,
          publicMessage: 'Invalid username (the part of the email before "@") format.',
        })
      })
    })

    describe('Reserved Username Validation', () => {
      it('should not create a user with gitea reserved usernames', async () => {
        await expect(otomiStack.createUser({ email: 'user@b.c', firstName: 'a', lastName: 'b' })).rejects.toMatchObject(
          {
            code: 400,
            publicMessage: 'This username (the part of the email before "@") is reserved.',
          },
        )
      })

      it('should not create a user with keycloak root user username', async () => {
        await expect(
          otomiStack.createUser({ email: 'otomi-admin@b.c', firstName: 'a', lastName: 'b' }),
        ).rejects.toMatchObject({
          code: 400,
          publicMessage: 'This username (the part of the email before "@") is reserved.',
        })
      })

      it('should not create a user with gitea reserved user patterns', async () => {
        await expect(
          otomiStack.createUser({ email: 'a.keys@b.c', firstName: 'a', lastName: 'b' }),
        ).rejects.toMatchObject({
          code: 400,
          publicMessage:
            'Usernames (the part of the email before "@") ending with .keys, .gpg, .rss, or .atom are not allowed.',
        })
      })
    })
  })

  describe('User Editing Endpoints/Functions', () => {
    describe('editUser', () => {
      it('should allow platform admin to edit a user', async () => {
        const user = { ...defaultPlatformAdmin, id: '3', email: 'edit@dev.linode-apl.net' }
        createTestUser(otomiStack, user)

        const updated = { ...user, firstName: 'edited' }
        const result = await otomiStack.editUser(user.id, updated, platformAdminSession)

        expect(result.firstName).toBe('edited')

        // Verify SealedSecret was written via Git
        expect(mockGit.writeTextFile).toHaveBeenCalled()
      })

      it('should not allow non-platform admin to edit a user', async () => {
        const user = { ...defaultPlatformAdmin, id: '4', email: 'edit2@dev.linode-apl.net' }
        createTestUser(otomiStack, user)

        await expect(
          otomiStack.editUser(user.id, user, { ...sessionUser, isPlatformAdmin: false }),
        ).rejects.toMatchObject({
          code: 403,
        })
      })
    })

    it('should not allow editing a user into a team that does not exist', async () => {
      createTestTeam(otomiStack, 'team1')

      const user = {
        ...teamMember1,
        id: 'missing-team-user',
        email: 'missing-team-user@dev.linode-apl.net',
        teams: ['team1'],
      }

      createTestUser(otomiStack, user)

      await expect(
        otomiStack.editUser(
          user.id!,
          {
            ...user,
            teams: ['team1', 'team-does-not-exist'],
          },
          platformAdminSession,
        ),
      ).rejects.toThrow(new NotExistError('Team(s) not found: team-does-not-exist'))

      expect(mockGit.writeTextFile).not.toHaveBeenCalled()
      expect(otomiStack.doDeployment).not.toHaveBeenCalled()
    })

    it('should allow editing a user into existing teams', async () => {
      createTestTeam(otomiStack, 'team1')
      createTestTeam(otomiStack, 'team2')

      const user = {
        ...teamMember1,
        id: 'existing-team-user',
        email: 'existing-team-user@dev.linode-apl.net',
        teams: ['team1'],
      }

      createTestUser(otomiStack, user)

      const result = await otomiStack.editUser(
        user.id!,
        {
          ...user,
          teams: ['team1', 'team2'],
        },
        platformAdminSession,
      )

      expect(result.teams).toEqual(['team1', 'team2'])
      expect(mockGit.writeTextFile).toHaveBeenCalled()
      expect(otomiStack.doDeployment).toHaveBeenCalled()
    })

    describe('canTeamAdminUpdateUserTeams', () => {
      // set session user as team admin
      sessionUser.isPlatformAdmin = false
      sessionUser.isTeamAdmin = true
      sessionUser.teams = ['team1', 'team2']

      // set team admin teams
      teamAdmin.teams = ['team1', 'team2']

      // set team member teams
      teamMember1.teams = ['team1']

      it('should allow team admin to add user to their own team', () => {
        const result = otomiStack['canTeamAdminUpdateUserTeams'](sessionUser, teamMember1, ['team1', 'team2'])
        expect(result).toBe(true)
      })

      it('should allow team admin to remove user from their own team', () => {
        const result = otomiStack['canTeamAdminUpdateUserTeams'](sessionUser, teamMember1, [])
        expect(result).toBe(true)
      })

      it('should not allow team admin to add user to a team they do not manage', () => {
        const result = otomiStack['canTeamAdminUpdateUserTeams'](sessionUser, teamMember1, ['team3'])
        expect(result).toBe(false)
      })

      it('should not allow team admin to remove themselves from their own team', () => {
        const selfUser = { ...teamAdmin, email: sessionUser.email }
        const result = otomiStack['canTeamAdminUpdateUserTeams'](sessionUser, selfUser, [])
        expect(result).toBe(false)
      })

      it('should not allow team admin to remove another team admin from their managed team', () => {
        const anotherAdmin = { ...teamAdmin }
        const result = otomiStack['canTeamAdminUpdateUserTeams'](sessionUser, anotherAdmin, [])
        expect(result).toBe(false)
      })

      it('should allow team admin to make no changes', () => {
        const result = otomiStack['canTeamAdminUpdateUserTeams'](sessionUser, teamMember1, ['team1'])
        expect(result).toBe(true)
      })
    })

    describe('editTeamUsers', () => {
      beforeEach(async () => {
        sessionUser.teams = ['team1']
        teamAdmin.teams = ['team1']
        teamMember1.teams = ['team1']
        teamMember2.teams = ['team2']

        // Pre-create users in FileStore
        createTestUser(otomiStack, { ...sessionUser, firstName: 'Session', lastName: 'User' })
        createTestUser(otomiStack, teamAdmin)
        createTestUser(otomiStack, teamMember1)
        createTestUser(otomiStack, teamMember2)

        jest.spyOn(otomiStack, 'doDeleteDeployment').mockResolvedValue()
      })

      it('should allow platform admin to update any user teams', async () => {
        const platformAdmin = { ...sessionUser, isPlatformAdmin: true, isTeamAdmin: false }
        const data = [{ ...teamMember1, teams: ['team1', 'team2'] }]
        const result = await otomiStack.editTeamUsers(data, platformAdmin)
        expect(result.find((u) => u.id === teamMember1.id)?.teams).toContain('team2')
      })

      it('should allow team admin to add user to their own team', async () => {
        const data = [{ ...teamMember2, teams: ['team2', 'team1'] }]
        const result = await otomiStack.editTeamUsers(data, sessionUser)
        expect(result.find((u) => u.id === teamMember2.id)?.teams).toContain('team1')
      })

      it('should allow team admin to remove user from their own team', async () => {
        const data = [{ ...teamMember1, teams: [] }]
        const result = await otomiStack.editTeamUsers(data, sessionUser)
        expect(result.find((u) => u.id === teamMember1.id)?.teams).not.toContain('team1')
      })

      it('should not allow team admin to add user to a team they do not manage', async () => {
        const data = [{ ...teamMember2, teams: ['team3'] }]
        await expect(otomiStack.editTeamUsers(data, sessionUser)).rejects.toMatchObject({
          code: 403,
          publicMessage:
            'Team admins are permitted to add or remove users only within the teams they manage. However, they cannot remove themselves or other team admins from those teams.',
        })
      })

      it('should not allow team admin to remove themselves from their own team', async () => {
        sessionUser.teams = ['team1']
        const data = [
          {
            name: 'Session User',
            email: `session@${domainSuffix}`,
            isPlatformAdmin: false,
            isTeamAdmin: true,
            teams: [],
            roles: [],
          },
        ]
        await expect(otomiStack.editTeamUsers(data, sessionUser)).rejects.toThrow()
      })

      it('should not allow regular user to update teams', async () => {
        const regularUser = {
          name: 'Regular User',
          email: 'regular@mail.com',
          isPlatformAdmin: false,
          isTeamAdmin: false,
          authz: {},
          teams: ['team1'],
          roles: [],
          sub: 'regular-user',
        }
        const data = [{ ...teamMember2, teams: ['team1'] }]
        await expect(otomiStack.editTeamUsers(data, regularUser)).rejects.toMatchObject({
          code: 403,
          publicMessage: "Only platform admins or team admins can modify a user's team memberships.",
        })
      })
    })
  })
})

describe('getVersions', () => {
  let otomiStack: OtomiStack

  beforeEach(async () => {
    otomiStack = new OtomiStack()
    await otomiStack.init()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('should return versions with otomi version from settings', async () => {
    const mockSettings = { otomi: { version: '1.2.3' } }
    jest.spyOn(otomiStack, 'getSettings').mockResolvedValue(mockSettings)

    const result = await (otomiStack as any).getVersions('abc123')

    expect(result).toHaveProperty('core', '1.2.3')
    expect(result).toHaveProperty('api')
    expect(result).toHaveProperty('console')
    expect(result).toHaveProperty('values', 'abc123')
    expect(otomiStack.getSettings).toHaveBeenCalledWith(['otomi'])
  })

  test('should fallback to env.VERSIONS.core when otomi.version is not available', async () => {
    const mockSettings = { otomi: undefined }
    jest.spyOn(otomiStack, 'getSettings').mockResolvedValue(mockSettings)

    const result = await (otomiStack as any).getVersions('def456')

    expect(result).toHaveProperty('core')
    expect(result).toHaveProperty('api')
    expect(result).toHaveProperty('console')
    expect(result).toHaveProperty('values', 'def456')
  })

  test('should fallback to process.env.npm_package_version when env.VERSIONS.api is not available', async () => {
    const originalNpmVersion = process.env.npm_package_version
    process.env.npm_package_version = '5.0.0'

    const mockSettings = { otomi: { version: '1.2.3' } }
    jest.spyOn(otomiStack, 'getSettings').mockResolvedValue(mockSettings)

    const result = await (otomiStack as any).getVersions('ghi789')

    expect(result).toHaveProperty('core', '1.2.3')
    expect(result).toHaveProperty('api')
    expect(result).toHaveProperty('console')
    expect(result).toHaveProperty('values', 'ghi789')

    process.env.npm_package_version = originalNpmVersion
  })

  test('should handle undefined otomi settings gracefully', async () => {
    const mockSettings = {}
    jest.spyOn(otomiStack, 'getSettings').mockResolvedValue(mockSettings)

    const result = await (otomiStack as any).getVersions('xyz123')

    expect(result).toHaveProperty('core')
    expect(result).toHaveProperty('api')
    expect(result).toHaveProperty('console')
    expect(result).toHaveProperty('values', 'xyz123')
  })

  test('should pass through currentSha as values field', async () => {
    const mockSettings = { otomi: { version: '1.0.0' } }
    jest.spyOn(otomiStack, 'getSettings').mockResolvedValue(mockSettings)

    const testSha = 'unique-commit-sha-123'
    const result = await (otomiStack as any).getVersions(testSha)

    expect(result.values).toBe(testSha)
    expect(typeof result.values).toBe('string')
  })

  test('should return all required version fields', async () => {
    const mockSettings = { otomi: { version: '1.0.0' } }
    jest.spyOn(otomiStack, 'getSettings').mockResolvedValue(mockSettings)

    const result = await (otomiStack as any).getVersions('test-sha')

    expect(Object.keys(result).sort()).toEqual(['api', 'console', 'core', 'values'])
    expect(typeof result.core).toBe('string')
    expect(typeof result.api).toBe('string')
    expect(typeof result.console).toBe('string')
    expect(typeof result.values).toBe('string')
  })
})

describe('PodService', () => {
  let otomiStack: OtomiStack
  let clientMock: {
    listNamespacedPod: jest.Mock
    listPodForAllNamespaces: jest.Mock
  }

  beforeEach(() => {
    otomiStack = new OtomiStack()
    clientMock = {
      listNamespacedPod: jest.fn(),
      listPodForAllNamespaces: jest.fn(),
    }
    // Override the API client
    ;(otomiStack as any).getApiClient = jest.fn(() => clientMock)
  })

  describe('getK8sPodLabelsForWorkload', () => {
    const baseLabels = { 'app.kubernetes.io/name': 'test', custom: 'label' }

    it('should return labels on primary Istio selector (namespaced)', async () => {
      clientMock.listNamespacedPod.mockResolvedValue({ items: [{ metadata: { labels: baseLabels } }] })

      const labels = await otomiStack.getK8sPodLabelsForWorkload('test', 'default')

      expect(clientMock.listNamespacedPod).toHaveBeenCalledWith({
        namespace: 'default',
        labelSelector: 'service.istio.io/canonical-name=test',
      })
      expect(labels).toEqual(baseLabels)
    })

    it('should fallback to RabbitMQ selector when primary returns none', async () => {
      clientMock.listNamespacedPod
        .mockResolvedValueOnce({ items: [] })
        .mockResolvedValueOnce({ items: [{ metadata: { labels: { rabbit: 'yes' } } }] })

      const labels = await otomiStack.getK8sPodLabelsForWorkload('test', 'default')

      expect(clientMock.listNamespacedPod).toHaveBeenCalledTimes(2)
      expect(clientMock.listNamespacedPod).toHaveBeenCalledWith({
        namespace: 'default',
        labelSelector: 'service.istio.io/canonical-name=test',
      })
      expect(clientMock.listNamespacedPod).toHaveBeenCalledWith({
        namespace: 'default',
        labelSelector: 'service.istio.io/canonical-name=test-rabbitmq-cluster',
      })
      expect(labels).toEqual({ rabbit: 'yes' })
    })

    it('should go through all fallback selectors and return empty object if none found', async () => {
      clientMock.listNamespacedPod.mockResolvedValue({ items: [] })

      const labels = await otomiStack.getK8sPodLabelsForWorkload('foo', 'bar')

      expect(clientMock.listNamespacedPod).toHaveBeenCalledTimes(5)
      expect(labels).toEqual({})
    })

    it('should search across all namespaces when no namespace provided', async () => {
      clientMock.listPodForAllNamespaces.mockResolvedValue({ items: [{ metadata: { labels: { global: 'yes' } } }] })

      const labels = await otomiStack.getK8sPodLabelsForWorkload('global', undefined)

      expect(clientMock.listPodForAllNamespaces).toHaveBeenCalledWith({
        labelSelector: 'service.istio.io/canonical-name=global',
      })
      expect(labels).toEqual({ global: 'yes' })
    })
  })

  describe('listUniquePodNamesByLabel', () => {
    it('should return empty array when no pods found (namespaced)', async () => {
      clientMock.listNamespacedPod.mockResolvedValue({ items: [] })

      const names = await otomiStack.listUniquePodNamesByLabel('app=test', 'default')

      expect(names).toEqual([])
      expect(clientMock.listNamespacedPod).toHaveBeenCalledWith({ namespace: 'default', labelSelector: 'app=test' })
    })

    it('should return full names for unique bases', async () => {
      const pods = [
        { metadata: { name: 'frontend-abc123' } },
        { metadata: { name: 'backend-def456' } },
        { metadata: { name: 'db-gh789' } },
      ]
      clientMock.listPodForAllNamespaces.mockResolvedValue({ items: pods })

      const names = await otomiStack.listUniquePodNamesByLabel('app=all')

      expect(names).toEqual(['frontend-abc123', 'backend-def456', 'db-gh789'])
    })

    it('should filter out duplicate base names, keeping first occurrence', async () => {
      const pods = [
        { metadata: { name: 'app-1-a1' } },
        { metadata: { name: 'app-1-b2' } },
        { metadata: { name: 'app-2-c3' } },
        { metadata: { name: 'app-2-d4' } },
      ]
      clientMock.listPodForAllNamespaces.mockResolvedValue({ items: pods })

      const names = await otomiStack.listUniquePodNamesByLabel('app=dup')

      expect(names).toEqual(['app-1-a1', 'app-2-c3'])
    })

    it('should handle pod names without dashes', async () => {
      const pods = [{ metadata: { name: 'singlename' } }]
      clientMock.listPodForAllNamespaces.mockResolvedValue({ items: pods })

      const names = await otomiStack.listUniquePodNamesByLabel('app=uniq')

      expect(names).toEqual(['singlename'])
    })
  })
})

describe('APL code repositories tests', () => {
  let otomiStack: OtomiStack
  let mockGit: jest.Mocked<Git>

  beforeEach(async () => {
    otomiStack = new OtomiStack()
    await otomiStack.init()

    const { FileStore } = require('./fileStore/file-store')
    otomiStack.fileStore = new FileStore()

    mockGit = mockDeep<Git>()
    otomiStack.git = mockGit

    const { getSessionStack } = require('src/middleware')
    jest.mocked(getSessionStack).mockResolvedValue(otomiStack)

    createTestTeam(otomiStack, 'demo', {})

    const codeRepo: AplCodeRepoResponse = {
      kind: 'AplTeamCodeRepo',
      metadata: {
        labels: {
          'apl.io/teamId': 'demo',
        },
        name: 'code-1',
      },
      spec: {
        gitService: 'gitea',
        repositoryUrl: 'https://gitea.test.com',
      },
      status: {},
    }

    otomiStack.fileStore.setTeamResource(codeRepo)

    jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()
    jest.spyOn(otomiStack, 'doDeleteDeployment').mockResolvedValue()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('should create an internal code repository', async () => {
    const codeRepo = await otomiStack.createAplCodeRepo('demo', {
      metadata: {
        name: 'code-2',
      },
      spec: {
        gitService: 'gitea',
        repositoryUrl: 'https://gitea-new.test.com',
      },
      kind: 'AplTeamCodeRepo',
    })

    expect(codeRepo).toEqual({
      kind: 'AplTeamCodeRepo',
      metadata: {
        labels: {
          'apl.io/teamId': 'demo',
        },
        name: 'code-2',
      },
      spec: {
        gitService: 'gitea',
        repositoryUrl: 'https://gitea-new.test.com',
      },
      status: expect.any(Object),
    })

    const stored = otomiStack.fileStore.getTeamResource('AplTeamCodeRepo', 'demo', 'code-2')
    expect(stored).toBeDefined()
    expect(stored?.metadata.name).toBe('code-2')
    expect(stored?.spec.gitService).toBe('gitea')
    expect(stored?.spec.repositoryUrl).toBe('https://gitea-new.test.com')
    expect(stored?.spec.private).toBeUndefined()
    expect(stored?.spec.secret).toBeUndefined()

    expect(otomiStack.doDeployment).toHaveBeenCalled()
  })

  test('should get an existing internal code repository', () => {
    const result = otomiStack.getAplCodeRepo('demo', 'code-1')

    expect(result).toEqual({
      kind: 'AplTeamCodeRepo',
      metadata: {
        labels: {
          'apl.io/teamId': 'demo',
        },
        name: 'code-1',
      },
      spec: {
        gitService: 'gitea',
        repositoryUrl: 'https://gitea.test.com',
      },
      status: {},
    })
  })

  test('should edit an existing internal code repository', async () => {
    const codeRepo = await otomiStack.editAplCodeRepo('demo', 'code-1', {
      spec: {
        gitService: 'gitea',
        repositoryUrl: 'https://gitea-updated.test.com',
      },
    })

    expect(codeRepo.metadata.name).toBe('code-1')
    expect(codeRepo.spec.gitService).toBe('gitea')
    expect(codeRepo.spec.repositoryUrl).toBe('https://gitea-updated.test.com')
    expect(codeRepo.spec.private).toBeUndefined()
    expect(codeRepo.spec.secret).toBeUndefined()

    const stored = otomiStack.fileStore.getTeamResource('AplTeamCodeRepo', 'demo', 'code-1')
    expect(stored?.spec.repositoryUrl).toBe('https://gitea-updated.test.com')
    expect(stored?.spec.private).toBeUndefined()
    expect(stored?.spec.secret).toBeUndefined()

    expect(otomiStack.doDeployment).toHaveBeenCalled()
  })

  test('should delete an existing internal code repository', async () => {
    let stored = otomiStack.fileStore.getTeamResource('AplTeamCodeRepo', 'demo', 'code-1')
    expect(stored).toBeDefined()

    await otomiStack.deleteAplCodeRepo('demo', 'code-1')

    stored = otomiStack.fileStore.getTeamResource('AplTeamCodeRepo', 'demo', 'code-1')
    expect(stored).toBeUndefined()

    expect(otomiStack.doDeleteDeployment).toHaveBeenCalled()
  })

  test('should create an external public code repository', async () => {
    const codeRepo = await otomiStack.createAplCodeRepo('demo', {
      metadata: {
        name: 'ext-pub-1',
      },
      spec: {
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
      },
      kind: 'AplTeamCodeRepo',
    })

    expect(codeRepo.metadata.name).toBe('ext-pub-1')
    expect(codeRepo.metadata.labels['apl.io/teamId']).toBe('demo')
    expect(codeRepo.spec.gitService).toBe('github')
    expect(codeRepo.spec.repositoryUrl).toBe('https://github.test.com')
    expect(codeRepo.spec.private).toBeFalsy()
    expect(codeRepo.spec.secret).toBeUndefined()

    const stored = otomiStack.fileStore.getTeamResource('AplTeamCodeRepo', 'demo', 'ext-pub-1')
    expect(stored).toBeDefined()
    expect(stored?.spec.gitService).toBe('github')
    expect(stored?.spec.repositoryUrl).toBe('https://github.test.com')
    expect(stored?.spec.secret).toBeUndefined()

    expect(otomiStack.doDeployment).toHaveBeenCalled()
  })

  test('should get an existing external public code repository', () => {
    const extPubRepo: AplCodeRepoResponse = {
      kind: 'AplTeamCodeRepo',
      metadata: {
        name: 'ext-pub-get',
        labels: {
          'apl.io/teamId': 'demo',
        },
      },
      spec: {
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
      },
      status: {},
    }

    otomiStack.fileStore.setTeamResource(extPubRepo)

    const result = otomiStack.getAplCodeRepo('demo', 'ext-pub-get')

    expect(result).toEqual(extPubRepo)
  })

  test('should edit an existing external public code repository', async () => {
    const extPubRepo: AplCodeRepoResponse = {
      kind: 'AplTeamCodeRepo',
      metadata: {
        name: 'ext-pub-edit',
        labels: {
          'apl.io/teamId': 'demo',
        },
      },
      spec: {
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
      },
      status: {},
    }

    otomiStack.fileStore.setTeamResource(extPubRepo)

    const codeRepo = await otomiStack.editAplCodeRepo('demo', 'ext-pub-edit', {
      spec: {
        gitService: 'github',
        repositoryUrl: 'https://github-updated.test.com',
      },
    })

    expect(codeRepo.metadata.name).toBe('ext-pub-edit')
    expect(codeRepo.spec.gitService).toBe('github')
    expect(codeRepo.spec.repositoryUrl).toBe('https://github-updated.test.com')
    expect(codeRepo.spec.secret).toBeUndefined()

    const stored = otomiStack.fileStore.getTeamResource('AplTeamCodeRepo', 'demo', 'ext-pub-edit')
    expect(stored?.spec.repositoryUrl).toBe('https://github-updated.test.com')
    expect(stored?.spec.secret).toBeUndefined()

    expect(otomiStack.doDeployment).toHaveBeenCalled()
  })

  test('should delete an existing external public code repository', async () => {
    const extPubRepo: AplCodeRepoResponse = {
      kind: 'AplTeamCodeRepo',
      metadata: {
        name: 'ext-pub-del',
        labels: {
          'apl.io/teamId': 'demo',
        },
      },
      spec: {
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
      },
      status: {},
    }

    otomiStack.fileStore.setTeamResource(extPubRepo)

    await otomiStack.deleteAplCodeRepo('demo', 'ext-pub-del')

    const stored = otomiStack.fileStore.getTeamResource('AplTeamCodeRepo', 'demo', 'ext-pub-del')
    expect(stored).toBeUndefined()

    expect(otomiStack.doDeleteDeployment).toHaveBeenCalled()
  })

  test('should create an external private code repository', async () => {
    const codeRepo = await otomiStack.createAplCodeRepo('demo', {
      metadata: {
        name: 'ext-priv-1',
      },
      spec: {
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
        private: true,
        secret: 'test',
      },
      kind: 'AplTeamCodeRepo',
    })

    expect(codeRepo.metadata.name).toBe('ext-priv-1')
    expect(codeRepo.metadata.labels['apl.io/teamId']).toBe('demo')
    expect(codeRepo.spec.gitService).toBe('github')
    expect(codeRepo.spec.repositoryUrl).toBe('https://github.test.com')
    expect(codeRepo.spec.private).toBe(true)
    expect(codeRepo.spec.secret).toBe('test')

    const stored = otomiStack.fileStore.getTeamResource('AplTeamCodeRepo', 'demo', 'ext-priv-1')
    expect(stored).toBeDefined()
    expect(stored?.spec.private).toBe(true)
    expect(stored?.spec.secret).toBe('test')

    expect(otomiStack.doDeployment).toHaveBeenCalled()
  })

  test('should edit an existing external private code repository', async () => {
    const extPrivRepo: AplCodeRepoResponse = {
      kind: 'AplTeamCodeRepo',
      metadata: {
        name: 'ext-priv-edit',
        labels: {
          'apl.io/teamId': 'demo',
        },
      },
      spec: {
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
        private: true,
        secret: 'test',
      },
      status: {},
    }

    otomiStack.fileStore.setTeamResource(extPrivRepo)

    const codeRepo = await otomiStack.editAplCodeRepo('demo', 'ext-priv-edit', {
      spec: {
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
        private: true,
        secret: 'test-updated',
      },
    })

    expect(codeRepo.metadata.name).toBe('ext-priv-edit')
    expect(codeRepo.spec.gitService).toBe('github')
    expect(codeRepo.spec.repositoryUrl).toBe('https://github.test.com')
    expect(codeRepo.spec.private).toBe(true)
    expect(codeRepo.spec.secret).toBe('test-updated')

    const stored = otomiStack.fileStore.getTeamResource('AplTeamCodeRepo', 'demo', 'ext-priv-edit')
    expect(stored?.spec.private).toBe(true)
    expect(stored?.spec.secret).toBe('test-updated')

    expect(otomiStack.doDeployment).toHaveBeenCalled()
  })

  test('should delete an existing external private code repository', async () => {
    const extPrivRepo: AplCodeRepoResponse = {
      kind: 'AplTeamCodeRepo',
      metadata: {
        name: 'ext-priv-del',
        labels: {
          'apl.io/teamId': 'demo',
        },
      },
      spec: {
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
        private: true,
        secret: 'test',
      },
      status: {},
    }

    otomiStack.fileStore.setTeamResource(extPrivRepo)

    await otomiStack.deleteAplCodeRepo('demo', 'ext-priv-del')

    const stored = otomiStack.fileStore.getTeamResource('AplTeamCodeRepo', 'demo', 'ext-priv-del')
    expect(stored).toBeUndefined()

    expect(otomiStack.doDeleteDeployment).toHaveBeenCalled()
  })
})

describe('OtomiStack.migrateGitSettings', () => {
  let stack: OtomiStack
  const mockCommit = jest.fn().mockResolvedValue(undefined)
  const mockPushToNewRemote = jest.fn().mockResolvedValue(undefined)
  const mockPushWithRetry = jest.fn().mockResolvedValue(undefined)
  const mockRootPull = jest.fn().mockResolvedValue(undefined)
  const mockRootFileStoreSet = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    stack = new OtomiStack()
    stack.editor = 'test@example.com'
    ;(stack as any).sessionId = 'test-session-id'
    jest.spyOn(stack as any, 'getSettings').mockReturnValue({
      otomi: { git: { repoUrl: 'https://old.example.com/repo.git', branch: 'main', email: 'old@example.com' } },
    })
    jest.spyOn(stack as any, 'extractAndStoreSettingsSecrets').mockResolvedValue(undefined)
    jest.spyOn(require('src/utils'), 'getValuesSchema').mockResolvedValue({ properties: {} })
    jest.spyOn(stack as any, 'saveSettings').mockResolvedValue(undefined)
    ;(stack as any).fileStore = { set: jest.fn() }
    ;(stack as any).git = {
      commit: mockCommit,
      pushToNewRemote: mockPushToNewRemote,
      pushWithRetry: mockPushWithRetry,
    }
    jest.spyOn(require('src/middleware/session'), 'getSessionStack').mockResolvedValue({
      git: { git: { pull: mockRootPull } },
      fileStore: { set: mockRootFileStoreSet },
    })
    jest.spyOn(require('src/middleware/session'), 'cleanSession').mockResolvedValue(undefined)
    ;(stack as any).getApiClient = jest.fn().mockReturnValue({
      createNamespacedSecret: jest.fn(),
    })
  })

  afterEach(() => jest.restoreAllMocks())

  it('calls saveSettings, commit, pushToNewRemote, pushWithRetry in order', async () => {
    await stack.migrateGitSettings({
      repoUrl: 'https://new.example.com/repo.git',
      username: 'user',
      password: 'pass',
      email: 'new@example.com',
      branch: 'main',
    })

    expect(mockPushToNewRemote).toHaveBeenCalled()
  })
})

describe('OtomiStack locked state', () => {
  let stack: OtomiStack

  beforeEach(() => {
    stack = new OtomiStack()
  })

  it('starts with locked = false', () => {
    expect(stack.locked).toBe(false)
  })

  it('getApiStatus returns { locked: false } initially', () => {
    expect(stack.getApiStatus()).toEqual({ locked: false })
  })

  it('setLocked(true) makes getApiStatus return { locked: true }', () => {
    stack.setLocked(true)
    expect(stack.getApiStatus()).toEqual({ locked: true })
  })

  it('setLocked(false) resets locked', () => {
    stack.setLocked(true)
    stack.setLocked(false)
    expect(stack.getApiStatus()).toEqual({ locked: false })
  })
})
