import { mockDeep } from 'jest-mock-extended'
import {
  AplCodeRepoResponse,
  AplServiceRequest,
  AplTeamSettingsRequest,
  App,
  CodeRepo,
  SessionUser,
  TeamConfig,
  User,
} from 'src/otomi-models'
import OtomiStack from 'src/otomi-stack'
import { loadSpec } from './app'
import { PublicUrlExists } from './error'
import { Git } from './git'
import { RepoService } from './services/RepoService'
import { TeamConfigService } from './services/TeamConfigService'

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

beforeAll(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'debug').mockImplementation(() => {})
  jest.spyOn(console, 'info').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})

  await loadSpec()
})

describe('Data validation', () => {
  let otomiStack: OtomiStack
  const teamId = 'aa'
  let mockRepoService: jest.Mocked<RepoService>
  let mockTeamConfigService: jest.Mocked<TeamConfigService>

  beforeEach(async () => {
    otomiStack = new OtomiStack()
    await otomiStack.init()
    otomiStack.git = mockDeep<Git>()
    mockRepoService = mockDeep<RepoService>()
    otomiStack.repoService = mockRepoService

    // Mock TeamConfigService
    mockTeamConfigService = mockDeep<TeamConfigService>()

    // Mocking getServices() to return a list of services
    mockTeamConfigService.getServices.mockReturnValue([
      {
        kind: 'AplTeamService',
        metadata: {
          name: 'svc',
          labels: {
            'apl.io/teamId': 'team-1',
          },
        },
        spec: {
          domain: 'b.a.com',
        },
        status: {},
      },
      {
        kind: 'AplTeamService',
        metadata: {
          name: 'svc',
          labels: {
            'apl.io/teamId': 'team-1',
          },
        },
        spec: {
          domain: 'b.a.com',
          paths: ['/test/'],
        },
        status: {},
      },
    ])

    // Ensure getTeamConfigService() returns our mocked TeamConfigService
    mockRepoService.getTeamConfigService.mockReturnValue(mockTeamConfigService)
    jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()
    jest.spyOn(otomiStack, 'doRepoDeployment').mockResolvedValue()
    jest.spyOn(otomiStack, 'doTeamDeployment').mockResolvedValue()
  })

  test('should throw exception on duplicated domain', () => {
    const svc: AplServiceRequest = {
      kind: 'AplTeamService',
      metadata: { name: 'svc' },
      spec: { domain: 'b.a.com' },
    }
    expect(() => otomiStack.checkPublicUrlInUse(teamId, svc)).toThrow(new PublicUrlExists())
  })

  test('should throw exception on duplicated url with path', () => {
    const svc: AplServiceRequest = {
      kind: 'AplTeamService',
      metadata: { name: 'svc' },
      spec: { domain: 'b.a.com', paths: ['/test/'] },
    }
    expect(() => otomiStack.checkPublicUrlInUse(teamId, svc)).toThrow(new PublicUrlExists())
  })

  test('should not throw exception on unique url', () => {
    const svc: AplServiceRequest = {
      kind: 'AplTeamService',
      metadata: { name: 'svc' },
      spec: { domain: 'b.a.com', paths: ['/bla'] },
    }
    expect(() => otomiStack.checkPublicUrlInUse(teamId, svc)).not.toThrow()
  })

  test('should not throw exception when of type cluster', () => {
    const svc: AplServiceRequest = {
      kind: 'AplTeamService',
      metadata: { name: 'svc' },
      spec: {},
    }
    expect(() => otomiStack.checkPublicUrlInUse(teamId, svc)).not.toThrow()
  })

  test('should not throw exception when editing', () => {
    const svc: AplServiceRequest = {
      kind: 'AplTeamService',
      metadata: { name: 'svc' },
      spec: { domain: 'c.a.com' },
    }

    expect(() => otomiStack.checkPublicUrlInUse(teamId, svc)).not.toThrow()
  })

  test('should create a password when password is not specified', async () => {
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
    const createItemSpy = jest.spyOn(otomiStack.repoService, 'createTeamConfig').mockReturnValue({
      builds: [],
      codeRepos: [],
      workloads: [],
      services: [],
      sealedsecrets: [],
      backups: [],
      projects: [],
      netpols: [],
      settings: teamSettings,
      apps: [],
      policies: [],
      workloadValues: [],
    } as TeamConfig)
    await otomiStack.createTeam({ name: 'test' }, false)
    expect(createItemSpy.mock.calls[0][0].spec.password).not.toEqual('')
    createItemSpy.mockRestore()
  })

  test('should not create a password when password is specified', async () => {
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
    const createItemSpy = jest.spyOn(otomiStack.repoService, 'createTeamConfig').mockReturnValue({
      builds: [],
      codeRepos: [],
      workloads: [],
      services: [],
      sealedsecrets: [],
      backups: [],
      projects: [],
      netpols: [],
      settings: teamSettings,
      apps: [],
      policies: [],
      workloadValues: [],
    } as TeamConfig)
    const myPassword = 'someAwesomePassword'
    await otomiStack.createTeam({ name: 'test', password: myPassword }, false)
    expect(createItemSpy.mock.calls[0][0].spec.password).toEqual(myPassword)
    createItemSpy.mockRestore()
  })
})

describe('Work with values', () => {
  let otomiStack: OtomiStack
  beforeEach(async () => {
    otomiStack = new OtomiStack()
    jest.spyOn(otomiStack, 'transformApps').mockReturnValue([])

    await otomiStack.init()
    otomiStack.git = new Git('./test', undefined, 'someuser', 'some@ema.il', undefined, undefined)
    jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()
    jest.spyOn(otomiStack, 'doRepoDeployment').mockResolvedValue()
    jest.spyOn(otomiStack, 'doTeamDeployment').mockResolvedValue()
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
    otomiStack.git = new Git('./test', undefined, 'someuser', 'some@ema.il', undefined, undefined)
    jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()
    jest.spyOn(otomiStack, 'doRepoDeployment').mockResolvedValue()
    jest.spyOn(otomiStack, 'doTeamDeployment').mockResolvedValue()
  })

  test('returns filtered apps if App array is submitted isPreinstalled flag is true', () => {
    const apps: App[] = [{ id: 'external-dns' }, { id: 'drone' }, { id: 'cnpg' }, { id: 'loki' }]
    jest.spyOn(otomiStack, 'getSettingsInfo').mockReturnValue({ otomi: { isPreInstalled: true } })
    const filteredApps = otomiStack.filterExcludedApp(apps)
    expect(filteredApps).toEqual([{ id: 'cnpg' }, { id: 'loki' }])
  })

  test('returns app with managed = true if single App is in excludedList and isPreinstalled flag is true', () => {
    const app: App = { id: 'external-dns' }
    jest.spyOn(otomiStack, 'getSettingsInfo').mockReturnValue({ otomi: { isPreInstalled: true } })
    const filteredApp = otomiStack.filterExcludedApp(app)
    expect(filteredApp).toEqual({ id: 'external-dns', managed: true })
  })
})

describe('Users tests', () => {
  let otomiStack: OtomiStack

  const domainSuffix = 'dev.linode-apl.net'

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
    otomiStack.git = mockDeep<Git>()

    jest.spyOn(otomiStack, 'getSettings').mockReturnValue({
      cluster: { name: 'default-cluster', domainSuffix, provider: 'linode' },
    })
    jest.spyOn(otomiStack, 'saveUser').mockResolvedValue()
    jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()
    jest.spyOn(otomiStack, 'doRepoDeployment').mockResolvedValue()
    jest.spyOn(otomiStack, 'doTeamDeployment').mockResolvedValue()
    jest.spyOn(otomiStack, 'transformApps').mockReturnValue([])
    jest.spyOn(otomiStack, 'getApp').mockReturnValue({ id: 'keycloak' })
    await otomiStack.initRepo()
    await otomiStack.createUser(defaultPlatformAdmin)
    await otomiStack.createUser(anyPlatformAdmin)
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
        await otomiStack.createUser(user)
        const updated = { ...user, firstName: 'edited' }
        jest.spyOn(otomiStack.repoService, 'updateUser').mockReturnValue(updated)
        // Use a platform admin session user
        const platformAdminSession = { ...sessionUser, isPlatformAdmin: true }
        const result = await otomiStack.editUser(user.id, updated, platformAdminSession)
        expect(result.firstName).toBe('edited')
      })

      it('should not allow non-platform admin to edit a user', async () => {
        const user = { ...defaultPlatformAdmin, id: '4', email: 'edit2@dev.linode-apl.net' }
        await otomiStack.createUser(user)
        await expect(
          otomiStack.editUser(user.id, user, { ...sessionUser, isPlatformAdmin: false }),
        ).rejects.toMatchObject({
          code: 403,
        })
      })
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

        otomiStack.repoService.createUser({ ...sessionUser, firstName: 'Session', lastName: 'User' })
        otomiStack.repoService.createUser(teamAdmin)
        otomiStack.repoService.createUser(teamMember1)
        otomiStack.repoService.createUser(teamMember2)
        jest.spyOn(otomiStack, 'saveUser').mockResolvedValue()
        jest.spyOn(otomiStack, 'doRepoDeployment').mockResolvedValue()
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

describe('Code repositories tests', () => {
  let otomiStack: OtomiStack
  let teamConfigService: TeamConfigService

  beforeEach(async () => {
    otomiStack = new OtomiStack()
    jest.spyOn(otomiStack, 'transformApps').mockReturnValue([])
    await otomiStack.init()
    await otomiStack.initRepo()
    otomiStack.git = mockDeep<Git>()
    const teamSettings = {
      kind: 'AplTeamSettingSet',
      metadata: {
        name: 'demo',
        labels: {
          'apl.io/teamId': 'demo',
        },
      },
      spec: {},
      status: {},
    } as AplTeamSettingsRequest
    try {
      otomiStack.repoService.createTeamConfig(teamSettings)
    } catch {
      // ignore
    }
    teamConfigService = otomiStack.repoService.getTeamConfigService('demo')
    const codeRepo: AplCodeRepoResponse = {
      kind: 'AplTeamCodeRepo',
      metadata: {
        labels: {
          'apl.io/teamId': 'demo',
        },
        name: 'code-1',
      },
      spec: { gitService: 'gitea', repositoryUrl: 'https://gitea.test.com' },
      status: {},
    }

    jest.spyOn(teamConfigService, 'getCodeRepo').mockReturnValue(codeRepo)
    jest.spyOn(otomiStack.git, 'deleteConfig').mockResolvedValue()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('should create an internal code repository', async () => {
    const createItemSpy = jest.spyOn(teamConfigService, 'createCodeRepo').mockReturnValue({
      kind: 'AplTeamCodeRepo',
      metadata: {
        labels: {
          'apl.io/teamId': 'demo',
        },
        name: 'code-1',
      },
      spec: { gitService: 'gitea', repositoryUrl: 'https://gitea.test.com' },
      status: {},
    })

    const saveTeamCodeReposSpy = jest.spyOn(otomiStack, 'saveTeamConfigItem').mockResolvedValue()
    const doDeploymentSpy = jest.spyOn(otomiStack, 'doTeamDeployment').mockResolvedValue()

    const codeRepo = await otomiStack.createCodeRepo('demo', {
      name: 'code-1',
      gitService: 'gitea',
      repositoryUrl: 'https://gitea.test.com',
    })

    expect(codeRepo).toEqual({
      teamId: 'demo',
      name: 'code-1',
      gitService: 'gitea',
      repositoryUrl: 'https://gitea.test.com',
    })
    expect(createItemSpy).toHaveBeenCalledWith({
      kind: 'AplTeamCodeRepo',
      metadata: {
        name: 'code-1',
      },
      spec: { name: 'code-1', gitService: 'gitea', repositoryUrl: 'https://gitea.test.com' },
    })
    expect(saveTeamCodeReposSpy).toHaveBeenCalledWith({
      kind: 'AplTeamCodeRepo',
      metadata: {
        name: 'code-1',
        labels: {
          'apl.io/teamId': 'demo',
        },
      },
      spec: { gitService: 'gitea', repositoryUrl: 'https://gitea.test.com' },
      status: {},
    })
    expect(doDeploymentSpy).toHaveBeenCalledWith('demo', expect.any(Function), false)

    createItemSpy.mockRestore()
    saveTeamCodeReposSpy.mockRestore()
    doDeploymentSpy.mockRestore()
  })

  test('should get an existing internal code repository', () => {
    const codeRepo: AplCodeRepoResponse = {
      kind: 'AplTeamCodeRepo',
      metadata: {
        name: 'code-1',
        labels: {
          'apl.io/teamId': 'demo',
        },
      },
      spec: { gitService: 'gitea', repositoryUrl: 'https://gitea.test.com' },
      status: {},
    }

    jest.spyOn(teamConfigService, 'getCodeRepo').mockReturnValue(codeRepo)

    const result = otomiStack.getCodeRepo('demo', '1')
    expect(result).toEqual({
      teamId: 'demo',
      name: 'code-1',
      gitService: 'gitea',
      repositoryUrl: 'https://gitea.test.com',
    })
  })

  test('should edit an existing internal code repository', async () => {
    const updateItemSpy = jest.spyOn(teamConfigService, 'updateCodeRepo').mockReturnValue({
      kind: 'AplTeamCodeRepo',
      metadata: {
        name: 'code-1-updated',
        labels: {
          'apl.io/teamId': 'demo',
        },
      },
      spec: {
        gitService: 'gitea',
        repositoryUrl: 'https://gitea.test.com',
      },
      status: {},
    })

    const saveTeamCodeReposSpy = jest.spyOn(otomiStack, 'saveTeamConfigItem').mockResolvedValue()
    const doDeploymentSpy = jest.spyOn(otomiStack, 'doTeamDeployment').mockResolvedValue()

    const codeRepo = await otomiStack.editCodeRepo('demo', '1', {
      teamId: 'demo',
      name: 'code-1-updated',
      gitService: 'gitea',
      repositoryUrl: 'https://gitea.test.com',
    })

    expect(codeRepo).toEqual({
      teamId: 'demo',
      name: 'code-1-updated',
      gitService: 'gitea',
      repositoryUrl: 'https://gitea.test.com',
    })
    expect(updateItemSpy).toHaveBeenCalledWith('1', {
      metadata: { name: 'code-1-updated' },
      spec: { name: 'code-1-updated', gitService: 'gitea', repositoryUrl: 'https://gitea.test.com' },
    })
    expect(saveTeamCodeReposSpy).toHaveBeenCalledWith({
      kind: 'AplTeamCodeRepo',
      metadata: {
        name: 'code-1-updated',
        labels: {
          'apl.io/teamId': 'demo',
        },
      },
      spec: { gitService: 'gitea', repositoryUrl: 'https://gitea.test.com' },
      status: {},
    })
    expect(doDeploymentSpy).toHaveBeenCalledWith('demo', expect.any(Function), false)

    updateItemSpy.mockRestore()
    saveTeamCodeReposSpy.mockRestore()
    doDeploymentSpy.mockRestore()
  })

  test('should delete an existing internal code repository', async () => {
    const codeRepo = {
      teamId: 'demo',
      name: 'code-1',
      gitService: 'gitea',
      repositoryUrl: 'https://gitea.test.com',
    } as CodeRepo

    jest.spyOn(otomiStack, 'getCodeRepo').mockReturnValue(codeRepo)
    const deleteItemSpy = jest.spyOn(teamConfigService, 'deleteCodeRepo').mockResolvedValue({} as never)
    const doDeploymentSpy = jest.spyOn(otomiStack, 'doTeamDeployment').mockResolvedValue()

    await otomiStack.deleteCodeRepo('demo', '1')

    expect(deleteItemSpy).toHaveBeenCalledWith('1')
    expect(doDeploymentSpy).toHaveBeenCalledWith('demo', expect.any(Function), false)

    deleteItemSpy.mockRestore()
    doDeploymentSpy.mockRestore()
  })

  test('should create an external public code repository', async () => {
    const createItemSpy = jest.spyOn(teamConfigService, 'createCodeRepo').mockReturnValue({
      kind: 'AplTeamCodeRepo',
      metadata: {
        name: 'code-1',
        labels: {
          'apl.io/teamId': 'demo',
        },
      },
      spec: {
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
      },
      status: {},
    })

    const saveTeamCodeReposSpy = jest.spyOn(otomiStack, 'saveTeamConfigItem').mockResolvedValue()
    const doDeploymentSpy = jest.spyOn(otomiStack, 'doTeamDeployment').mockResolvedValue()

    const codeRepo = await otomiStack.createCodeRepo('demo', {
      name: 'code-1',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
    })

    expect(codeRepo).toEqual({
      teamId: 'demo',
      name: 'code-1',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
    })
    expect(createItemSpy).toHaveBeenCalledWith({
      kind: 'AplTeamCodeRepo',
      metadata: { name: 'code-1' },
      spec: {
        name: 'code-1',
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
      },
    })
    expect(saveTeamCodeReposSpy).toHaveBeenCalledWith({
      kind: 'AplTeamCodeRepo',
      metadata: {
        name: 'code-1',
        labels: {
          'apl.io/teamId': 'demo',
        },
      },
      spec: {
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
      },
      status: {},
    })
    expect(doDeploymentSpy).toHaveBeenCalledWith('demo', expect.any(Function), false)

    createItemSpy.mockRestore()
    saveTeamCodeReposSpy.mockRestore()
    doDeploymentSpy.mockRestore()
  })

  test('should get an existing external public code repository', () => {
    const codeRepo: AplCodeRepoResponse = {
      kind: 'AplTeamCodeRepo',
      metadata: {
        name: 'code-1',
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

    jest.spyOn(teamConfigService, 'getCodeRepo').mockReturnValue(codeRepo)

    const result = otomiStack.getCodeRepo('demo', '1')
    expect(result).toEqual({
      teamId: 'demo',
      name: 'code-1',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
    })
  })

  test('should edit an existing external public code repository', async () => {
    const updateItemSpy = jest.spyOn(teamConfigService, 'updateCodeRepo').mockReturnValue({
      kind: 'AplTeamCodeRepo',
      metadata: {
        name: 'code-1-updated',
        labels: {
          'apl.io/teamId': 'demo',
        },
      },
      spec: {
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
      },
      status: {},
    })

    const saveTeamCodeReposSpy = jest.spyOn(otomiStack, 'saveTeamConfigItem').mockResolvedValue()
    const doDeploymentSpy = jest.spyOn(otomiStack, 'doTeamDeployment').mockResolvedValue()

    const codeRepo = await otomiStack.editCodeRepo('demo', '1', {
      teamId: 'demo',
      name: 'code-1-updated',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
    })

    expect(codeRepo).toEqual({
      teamId: 'demo',
      name: 'code-1-updated',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
    })
    expect(updateItemSpy).toHaveBeenCalledWith('1', {
      metadata: { name: 'code-1-updated' },
      spec: {
        name: 'code-1-updated',
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
      },
    })
    expect(saveTeamCodeReposSpy).toHaveBeenCalledWith({
      kind: 'AplTeamCodeRepo',
      metadata: { name: 'code-1-updated', labels: { 'apl.io/teamId': 'demo' } },
      spec: {
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
      },
      status: {},
    })
    expect(doDeploymentSpy).toHaveBeenCalledWith('demo', expect.any(Function), false)

    updateItemSpy.mockRestore()
    saveTeamCodeReposSpy.mockRestore()
    doDeploymentSpy.mockRestore()
  })

  test('should delete an existing external public code repository', async () => {
    const codeRepo = {
      teamId: 'demo',
      name: 'code-1',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
    } as CodeRepo

    jest.spyOn(otomiStack, 'getCodeRepo').mockReturnValue(codeRepo)
    const deleteItemSpy = jest.spyOn(teamConfigService, 'deleteCodeRepo').mockResolvedValue({} as never)
    const doDeploymentSpy = jest.spyOn(otomiStack, 'doTeamDeployment').mockResolvedValue()

    await otomiStack.deleteCodeRepo('demo', '1')

    expect(deleteItemSpy).toHaveBeenCalledWith('1')
    expect(doDeploymentSpy).toHaveBeenCalledWith('demo', expect.any(Function), false)

    deleteItemSpy.mockRestore()
    doDeploymentSpy.mockRestore()
  })

  test('should create an external private code repository', async () => {
    const createItemSpy = jest.spyOn(teamConfigService, 'createCodeRepo').mockReturnValue({
      kind: 'AplTeamCodeRepo',
      metadata: {
        name: 'code-1',
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
    })

    const saveTeamCodeReposSpy = jest.spyOn(otomiStack, 'saveTeamConfigItem').mockResolvedValue()
    const doDeploymentSpy = jest.spyOn(otomiStack, 'doTeamDeployment').mockResolvedValue()

    const codeRepo = await otomiStack.createCodeRepo('demo', {
      name: 'code-1',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
      private: true,
      secret: 'test',
    })

    expect(codeRepo).toEqual({
      teamId: 'demo',
      name: 'code-1',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
      private: true,
      secret: 'test',
    })
    expect(createItemSpy).toHaveBeenCalledWith({
      kind: 'AplTeamCodeRepo',
      metadata: { name: 'code-1' },
      spec: {
        name: 'code-1',
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
        private: true,
        secret: 'test',
      },
    })
    expect(saveTeamCodeReposSpy).toHaveBeenCalledWith({
      kind: 'AplTeamCodeRepo',
      metadata: { name: 'code-1', labels: { 'apl.io/teamId': 'demo' } },
      spec: {
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
        private: true,
        secret: 'test',
      },
      status: {},
    })
    expect(doDeploymentSpy).toHaveBeenCalledWith('demo', expect.any(Function), false)

    createItemSpy.mockRestore()
    saveTeamCodeReposSpy.mockRestore()
    doDeploymentSpy.mockRestore()
  })

  test('should edit an existing external private code repository', async () => {
    const updateItemSpy = jest.spyOn(teamConfigService, 'updateCodeRepo').mockReturnValue({
      kind: 'AplTeamCodeRepo',
      metadata: {
        name: 'code-1-updated',
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
    })

    const saveTeamCodeReposSpy = jest.spyOn(otomiStack, 'saveTeamConfigItem').mockResolvedValue()
    const doDeploymentSpy = jest.spyOn(otomiStack, 'doTeamDeployment').mockResolvedValue()

    const codeRepo = await otomiStack.editCodeRepo('demo', '1', {
      teamId: 'demo',
      name: 'code-1-updated',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
      private: true,
      secret: 'test',
    })

    expect(codeRepo).toEqual({
      teamId: 'demo',
      name: 'code-1-updated',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
      private: true,
      secret: 'test',
    })
    expect(updateItemSpy).toHaveBeenCalledWith('1', {
      metadata: {
        name: 'code-1-updated',
      },
      spec: {
        name: 'code-1-updated',
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
        private: true,
        secret: 'test',
      },
    })
    expect(saveTeamCodeReposSpy).toHaveBeenCalledWith({
      kind: 'AplTeamCodeRepo',
      metadata: {
        name: 'code-1-updated',
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
    })
    expect(doDeploymentSpy).toHaveBeenCalledWith('demo', expect.any(Function), false)

    updateItemSpy.mockRestore()
    saveTeamCodeReposSpy.mockRestore()
    doDeploymentSpy.mockRestore()
  })

  test('should delete an existing external private code repository', async () => {
    const codeRepo = {
      teamId: 'demo',
      name: 'code-1',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
      private: true,
      secret: 'test',
    } as CodeRepo

    jest.spyOn(otomiStack, 'getCodeRepo').mockReturnValue(codeRepo)
    const deleteItemSpy = jest.spyOn(teamConfigService, 'deleteCodeRepo').mockResolvedValue({} as never)
    const doDeploymentSpy = jest.spyOn(otomiStack, 'doTeamDeployment').mockResolvedValue()

    await otomiStack.deleteCodeRepo('demo', '1')

    expect(deleteItemSpy).toHaveBeenCalledWith('1')
    expect(doDeploymentSpy).toHaveBeenCalledWith('demo', expect.any(Function), false)

    deleteItemSpy.mockRestore()
    doDeploymentSpy.mockRestore()
  })
})
