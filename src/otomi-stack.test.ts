/* eslint-disable @typescript-eslint/no-empty-function */
import { AplCodeRepoResponse, AplServiceRequest, App, CodeRepo, Team, TeamConfig, User } from 'src/otomi-models'
import OtomiStack from 'src/otomi-stack'
import { mockDeep } from 'jest-mock-extended'
import { PublicUrlExists } from './error'
import { loadSpec } from './app'
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
        metadata: { name: 'svc', labels: {} },
        spec: {
          type: 'public',
          domain: 'b.a.com',
        },
        status: {},
      },
      {
        kind: 'AplTeamService',
        metadata: { name: 'svc', labels: {} },
        spec: {
          type: 'public',
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
      spec: { type: 'public', domain: 'b.a.com' },
    }
    expect(() => otomiStack.checkPublicUrlInUse(teamId, svc)).toThrow(new PublicUrlExists())
  })

  test('should throw exception on duplicated url with path', () => {
    const svc: AplServiceRequest = {
      kind: 'AplTeamService',
      metadata: { name: 'svc' },
      spec: { type: 'public', domain: 'b.a.com', paths: ['/test/'] },
    }
    expect(() => otomiStack.checkPublicUrlInUse(teamId, svc)).toThrow(new PublicUrlExists())
  })

  test('should not throw exception on unique url', () => {
    const svc: AplServiceRequest = {
      kind: 'AplTeamService',
      metadata: { name: 'svc' },
      spec: { type: 'public', domain: 'b.a.com', paths: ['/bla'] },
    }
    expect(() => otomiStack.checkPublicUrlInUse(teamId, svc)).not.toThrow()
  })

  test('should not throw exception when of type cluster', () => {
    const svc: AplServiceRequest = {
      kind: 'AplTeamService',
      metadata: { name: 'svc' },
      spec: { type: 'cluster' },
    }
    expect(() => otomiStack.checkPublicUrlInUse(teamId, svc)).not.toThrow()
  })

  test('should not throw exception when editing', () => {
    const svc: AplServiceRequest = {
      kind: 'AplTeamService',
      metadata: { name: 'svc' },
      spec: { type: 'public', domain: 'c.a.com' },
    }

    expect(() => otomiStack.checkPublicUrlInUse(teamId, svc)).not.toThrow()
  })

  test('should create a password when password is not specified', async () => {
    const createItemSpy = jest.spyOn(otomiStack.repoService, 'createTeamConfig').mockReturnValue({
      builds: [],
      codeRepos: [],
      workloads: [],
      services: [],
      sealedsecrets: [],
      backups: [],
      projects: [],
      netpols: [],
      settings: {} as Team,
      apps: [],
      policies: [],
      workloadValues: [],
    } as TeamConfig)
    await otomiStack.createTeam({ name: 'test' }, false)
    expect(createItemSpy.mock.calls[0][1].password).not.toEqual('')
    createItemSpy.mockRestore()
  })

  test('should not create a password when password is specified', async () => {
    const createItemSpy = jest.spyOn(otomiStack.repoService, 'createTeamConfig').mockReturnValue({
      builds: [],
      codeRepos: [],
      workloads: [],
      services: [],
      sealedsecrets: [],
      backups: [],
      projects: [],
      netpols: [],
      settings: {} as Team,
      apps: [],
      policies: [],
      workloadValues: [],
    } as TeamConfig)
    const myPassword = 'someAwesomePassword'
    await otomiStack.createTeam({ name: 'test', password: myPassword }, false)
    expect(createItemSpy.mock.calls[0][1].password).toEqual(myPassword)
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

  beforeEach(async () => {
    otomiStack = new OtomiStack()
    await otomiStack.init()
    otomiStack.git = mockDeep<Git>()

    jest.spyOn(otomiStack, 'getSettings').mockReturnValue({
      cluster: { domainSuffix },
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

  it('should not create a user if the username starts with non-alphanumeric characters', async () => {
    await expect(otomiStack.createUser({ email: '-abc@b.c', firstName: 'a', lastName: 'b' })).rejects.toMatchObject({
      code: 400,
      publicMessage: 'Invalid username (the part of the email before "@") format.',
    })
  })

  it('should not create a user if the username ends with non-alphanumeric characters', async () => {
    await expect(otomiStack.createUser({ email: 'abc-@b.c', firstName: 'a', lastName: 'b' })).rejects.toMatchObject({
      code: 400,
      publicMessage: 'Invalid username (the part of the email before "@") format.',
    })
  })

  it('should not create a user if the username includes consecutive non-alphanumeric characters', async () => {
    await expect(otomiStack.createUser({ email: 'ab--c@b.c', firstName: 'a', lastName: 'b' })).rejects.toMatchObject({
      code: 400,
      publicMessage: 'Invalid username (the part of the email before "@") format.',
    })
  })

  it('should not create a user with gitea reserved usernames', async () => {
    await expect(otomiStack.createUser({ email: 'user@b.c', firstName: 'a', lastName: 'b' })).rejects.toMatchObject({
      code: 400,
      publicMessage: 'This username (the part of the email before "@") is reserved.',
    })
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
    await expect(otomiStack.createUser({ email: 'a.keys@b.c', firstName: 'a', lastName: 'b' })).rejects.toMatchObject({
      code: 400,
      publicMessage:
        'Usernames (the part of the email before "@") ending with .keys, .gpg, .rss, or .atom are not allowed.',
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

    try {
      otomiStack.repoService.createTeamConfig('demo', { name: 'demo' })
    } catch {
      // ignore
    }
    teamConfigService = otomiStack.repoService.getTeamConfigService('demo')
    const codeRepo: AplCodeRepoResponse = {
      kind: 'AplTeamCodeRepo',
      metadata: {
        labels: {
          'apl.io/id': '1',
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
          'apl.io/id': '2',
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
      id: '2',
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
          'apl.io/id': '2',
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
          'apl.io/id': '1',
          'apl.io/teamId': 'demo',
        },
      },
      spec: { gitService: 'gitea', repositoryUrl: 'https://gitea.test.com' },
      status: {},
    }

    jest.spyOn(teamConfigService, 'getCodeRepo').mockReturnValue(codeRepo)

    const result = otomiStack.getCodeRepo('demo', '1')
    expect(result).toEqual({
      id: '1',
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
          'apl.io/id': '1',
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
      id: '1',
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
          'apl.io/id': '1',
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
      id: '1',
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
          'apl.io/id': '1',
          'apl.io/teamId': 'demo',
        },
      },
      spec: {
        name: 'code-1',
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
      id: '1',
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
          'apl.io/id': '1',
          'apl.io/teamId': 'demo',
        },
      },
      spec: {
        name: 'code-1',
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
          'apl.io/id': '1',
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
      id: '1',
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
          'apl.io/id': '1',
          'apl.io/teamId': 'demo',
        },
      },
      spec: {
        name: 'code-1-updated',
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
      id: '1',
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
      metadata: { name: 'code-1-updated', labels: { 'apl.io/id': '1', 'apl.io/teamId': 'demo' } },
      spec: {
        name: 'code-1-updated',
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
      id: '1',
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
          'apl.io/id': '1',
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
      id: '1',
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
      metadata: { name: 'code-1', labels: { 'apl.io/id': '1', 'apl.io/teamId': 'demo' } },
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
          'apl.io/id': '1',
          'apl.io/teamId': 'demo',
        },
      },
      spec: {
        name: 'code-1-updated',
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
      id: '1',
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
          'apl.io/id': '1',
          'apl.io/teamId': 'demo',
        },
      },
      spec: {
        name: 'code-1-updated',
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
      id: '1',
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
