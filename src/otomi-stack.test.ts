/* eslint-disable @typescript-eslint/no-empty-function */
import { mockDeep } from 'jest-mock-extended'
import { App, Coderepo, User, Workload } from 'src/otomi-models'
import OtomiStack from 'src/otomi-stack'
import { Repo } from 'src/repo'
import { loadSpec } from './app'
import { PublicUrlExists } from './error'

jest.mock('src/utils', () => {
  const originalModule = jest.requireActual('src/utils')

  return {
    __esModule: true,
    ...originalModule,
    getServiceUrl: jest.fn().mockResolvedValue({ subdomain: '', domain: 'test' }),
    getValuesSchema: jest.fn().mockResolvedValue({}),
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

  beforeEach(async () => {
    otomiStack = new OtomiStack()
    await otomiStack.init()
    otomiStack.repo = mockDeep<Repo>()
    jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()
  })

  test('should throw exception on duplicated domain', async () => {
    const svc = { name: 'svc', ingress: { domain: 'a.com', subdomain: 'b' } }
    const svc1 = { ...svc }
    await otomiStack.createService('aa', svc)
    expect(() => otomiStack.checkPublicUrlInUse(svc1)).toThrow(new PublicUrlExists())
  })

  test('should throw exception on duplicated url with path', async () => {
    const svc = { name: 'svc', ingress: { domain: 'a.com', subdomain: 'b', paths: ['/test/'] } }
    await otomiStack.createService('aa', svc)
    expect(() => otomiStack.checkPublicUrlInUse(svc)).toThrow(new PublicUrlExists())
  })

  test('should not throw exception on unique url', async () => {
    const svc1 = { name: 'svc', ingress: { domain: 'a.com', subdomain: 'b', paths: ['/test/'] } }
    await otomiStack.createService('aa', svc1)
    const svc2 = { name: 'svc', ingress: { domain: 'a.com', subdomain: 'b' } }
    const svc3 = { name: 'svc', ingress: { domain: 'a.com', subdomain: 'b', paths: ['/bla'] } }
    expect(() => otomiStack.checkPublicUrlInUse(svc2)).not.toThrow()
    expect(() => otomiStack.checkPublicUrlInUse(svc3)).not.toThrow()
  })

  test('should not throw exception when of type cluster', async () => {
    const svc = { name: 'svc', ingress: { type: 'cluster' } }
    // @ts-ignore
    await otomiStack.createService('aa', svc)
    expect(() => otomiStack.checkPublicUrlInUse(svc)).not.toThrow()
  })

  test('should not throw exception when editing', async () => {
    const svc = { id: 'x1', name: 'svc', ingress: { domain: 'a.com', subdomain: 'b', paths: ['/test/'] } }
    await otomiStack.createService('aa', svc)
    const svc1 = { id: 'x1', name: 'svc', ingress: { domain: 'a.com', subdomain: 'c' } }
    expect(() => otomiStack.checkPublicUrlInUse(svc1)).not.toThrow()
  })

  test('should create a password when password is not specified', async () => {
    const createItemSpy = jest.spyOn(otomiStack.db, 'createItem')
    await otomiStack.createTeam({ name: 'test' })
    expect(createItemSpy.mock.calls[0][1].password).not.toEqual('')
    createItemSpy.mockRestore()
  })

  test('should not create a password when password is specified', async () => {
    const createItemSpy = jest.spyOn(otomiStack.db, 'createItem')
    const myPassword = 'someAwesomePassword'
    await otomiStack.createTeam({ name: 'test', password: myPassword })
    expect(createItemSpy.mock.calls[0][1].password).toEqual(myPassword)
    createItemSpy.mockRestore()
  })
})

describe('Work with values', () => {
  let otomiStack: OtomiStack
  beforeEach(async () => {
    otomiStack = new OtomiStack()
    await otomiStack.init()
    otomiStack.repo = new Repo('./test', undefined, 'someuser', 'some@ema.il', undefined, undefined)
    jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()
    jest.spyOn(otomiStack, 'loadApp').mockResolvedValue()
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
    otomiStack.repo = new Repo('./test', undefined, 'someuser', 'some@ema.il', undefined, undefined)
    jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()
  })

  test('can load workload values (empty dict)', async () => {
    const w: Workload = { id: '1', teamId: '2', name: 'name', url: 'https://test.local' }

    otomiStack.repo.fileExists = jest.fn().mockReturnValue(true)
    otomiStack.repo.readFile = jest.fn().mockReturnValue({})
    const res = await otomiStack.loadWorkloadValues(w)
    expect(res).toEqual({ id: '1', teamId: '2', name: 'name', values: {} })
  })

  test('can load workload values (dict)', async () => {
    const w: Workload = { id: '1', teamId: '2', name: 'name', url: 'https://test.local' }

    otomiStack.repo.fileExists = jest.fn().mockReturnValue(true)
    otomiStack.repo.readFile = jest.fn().mockReturnValue({ values: 'test: 1' })
    const res = await otomiStack.loadWorkloadValues(w)
    expect(res).toEqual({ id: '1', teamId: '2', name: 'name', values: { test: 1 } })
  })

  test('can load workload values (empty string)', async () => {
    const w: Workload = { id: '1', teamId: '2', name: 'name', url: 'https://test.local' }

    otomiStack.repo.fileExists = jest.fn().mockReturnValue(true)
    otomiStack.repo.readFile = jest.fn().mockReturnValue({ values: '' })
    const res = await otomiStack.loadWorkloadValues(w)
    expect(res).toEqual({ id: '1', teamId: '2', name: 'name', values: {} })
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
    otomiStack.repo = mockDeep<Repo>()
    otomiStack.loadApps = jest.fn().mockResolvedValue([])
    const dbMock = mockDeep<OtomiStack['db']>()
    dbMock.getItem.mockImplementation((collection, query) => {
      return [defaultPlatformAdmin, anyPlatformAdmin].find((user) => user.id === query.id)
    })
    dbMock.deleteItem.mockReturnValue()

    otomiStack.db = dbMock

    jest.spyOn(otomiStack, 'getSettings').mockReturnValue({
      cluster: { domainSuffix },
    })
    jest.spyOn(otomiStack, 'saveUsers').mockResolvedValue()
    jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()
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

  beforeEach(async () => {
    otomiStack = new OtomiStack()
    await otomiStack.init()
    const dbMock = mockDeep<OtomiStack['db']>()
    dbMock.deleteItem.mockReturnValue()
    otomiStack.db = dbMock
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('should create an internal code repository', async () => {
    const createItemSpy = jest.spyOn(otomiStack.db, 'createItem').mockReturnValue({
      teamId: 'demo',
      label: 'code-1',
      gitService: 'gitea',
      repositoryUrl: 'https://gitea.test.com',
    } as Coderepo)

    const saveTeamCodereposSpy = jest.spyOn(otomiStack, 'saveTeamCoderepos').mockResolvedValue()
    const doDeploymentSpy = jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()

    const coderepo = await otomiStack.createCoderepo('demo', {
      label: 'code-1',
      gitService: 'gitea',
      repositoryUrl: 'https://gitea.test.com',
    })

    expect(coderepo).toEqual({
      teamId: 'demo',
      label: 'code-1',
      gitService: 'gitea',
      repositoryUrl: 'https://gitea.test.com',
    })
    expect(createItemSpy).toHaveBeenCalledWith(
      'coderepos',
      {
        teamId: 'demo',
        label: 'code-1',
        gitService: 'gitea',
        repositoryUrl: 'https://gitea.test.com',
      },
      { teamId: 'demo', label: 'code-1' },
    )
    expect(saveTeamCodereposSpy).toHaveBeenCalledWith('demo')
    expect(doDeploymentSpy).toHaveBeenCalledWith(['coderepos'])

    createItemSpy.mockRestore()
    saveTeamCodereposSpy.mockRestore()
    doDeploymentSpy.mockRestore()
  })

  test('should get an existing internal code repository', () => {
    const coderepo = {
      id: '1',
      teamId: 'demo',
      label: 'code-1',
      gitService: 'gitea',
      repositoryUrl: 'https://gitea.test.com',
    } as Coderepo

    jest.spyOn(otomiStack.db, 'getItem').mockReturnValue(coderepo)

    const result = otomiStack.getCoderepo('1')
    expect(result).toEqual(coderepo)
  })

  test('should edit an existing internal code repository', async () => {
    const updateItemSpy = jest.spyOn(otomiStack.db, 'updateItem').mockReturnValue({
      id: '1',
      teamId: 'demo',
      label: 'code-1-updated',
      gitService: 'gitea',
      repositoryUrl: 'https://gitea.test.com',
    } as Coderepo)

    const saveTeamCodereposSpy = jest.spyOn(otomiStack, 'saveTeamCoderepos').mockResolvedValue()
    const doDeploymentSpy = jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()

    const coderepo = await otomiStack.editCoderepo('1', {
      teamId: 'demo',
      label: 'code-1-updated',
      gitService: 'gitea',
      repositoryUrl: 'https://gitea.test.com',
    })

    expect(coderepo).toEqual({
      id: '1',
      teamId: 'demo',
      label: 'code-1-updated',
      gitService: 'gitea',
      repositoryUrl: 'https://gitea.test.com',
    })
    expect(updateItemSpy).toHaveBeenCalledWith(
      'coderepos',
      {
        teamId: 'demo',
        label: 'code-1-updated',
        gitService: 'gitea',
        repositoryUrl: 'https://gitea.test.com',
      },
      { id: '1' },
    )
    expect(saveTeamCodereposSpy).toHaveBeenCalledWith('demo')
    expect(doDeploymentSpy).toHaveBeenCalledWith(['coderepos'])

    updateItemSpy.mockRestore()
    saveTeamCodereposSpy.mockRestore()
    doDeploymentSpy.mockRestore()
  })

  test('should delete an existing internal code repository', async () => {
    const coderepo = {
      id: '1',
      teamId: 'demo',
      label: 'code-1',
      gitService: 'gitea',
      repositoryUrl: 'https://gitea.test.com',
    } as Coderepo

    jest.spyOn(otomiStack, 'getCoderepo').mockReturnValue(coderepo)
    const deleteItemSpy = jest.spyOn(otomiStack.db, 'deleteItem').mockResolvedValue({} as never)
    const saveTeamCodereposSpy = jest.spyOn(otomiStack, 'saveTeamCoderepos').mockResolvedValue()
    const doDeploymentSpy = jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()

    await otomiStack.deleteCoderepo('1')

    expect(deleteItemSpy).toHaveBeenCalledWith('coderepos', { id: '1' })
    expect(saveTeamCodereposSpy).toHaveBeenCalledWith('demo')
    expect(doDeploymentSpy).toHaveBeenCalledWith(['coderepos'])

    deleteItemSpy.mockRestore()
    saveTeamCodereposSpy.mockRestore()
    doDeploymentSpy.mockRestore()
  })

  test('should create an external public code repository', async () => {
    const createItemSpy = jest.spyOn(otomiStack.db, 'createItem').mockReturnValue({
      teamId: 'demo',
      label: 'code-1',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
    } as Coderepo)

    const saveTeamCodereposSpy = jest.spyOn(otomiStack, 'saveTeamCoderepos').mockResolvedValue()
    const doDeploymentSpy = jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()

    const coderepo = await otomiStack.createCoderepo('demo', {
      label: 'code-1',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
    })

    expect(coderepo).toEqual({
      teamId: 'demo',
      label: 'code-1',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
    })
    expect(createItemSpy).toHaveBeenCalledWith(
      'coderepos',
      {
        teamId: 'demo',
        label: 'code-1',
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
      },
      { teamId: 'demo', label: 'code-1' },
    )
    expect(saveTeamCodereposSpy).toHaveBeenCalledWith('demo')
    expect(doDeploymentSpy).toHaveBeenCalledWith(['coderepos'])

    createItemSpy.mockRestore()
    saveTeamCodereposSpy.mockRestore()
    doDeploymentSpy.mockRestore()
  })

  test('should get an existing external public code repository', () => {
    const coderepo = {
      id: '1',
      teamId: 'demo',
      label: 'code-1',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
    } as Coderepo

    jest.spyOn(otomiStack.db, 'getItem').mockReturnValue(coderepo)

    const result = otomiStack.getCoderepo('1')
    expect(result).toEqual(coderepo)
  })

  test('should edit an existing external public code repository', async () => {
    const updateItemSpy = jest.spyOn(otomiStack.db, 'updateItem').mockReturnValue({
      id: '1',
      teamId: 'demo',
      label: 'code-1-updated',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
    } as Coderepo)

    const saveTeamCodereposSpy = jest.spyOn(otomiStack, 'saveTeamCoderepos').mockResolvedValue()
    const doDeploymentSpy = jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()

    const coderepo = await otomiStack.editCoderepo('1', {
      teamId: 'demo',
      label: 'code-1-updated',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
    })

    expect(coderepo).toEqual({
      id: '1',
      teamId: 'demo',
      label: 'code-1-updated',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
    })
    expect(updateItemSpy).toHaveBeenCalledWith(
      'coderepos',
      {
        teamId: 'demo',
        label: 'code-1-updated',
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
      },
      { id: '1' },
    )
    expect(saveTeamCodereposSpy).toHaveBeenCalledWith('demo')
    expect(doDeploymentSpy).toHaveBeenCalledWith(['coderepos'])

    updateItemSpy.mockRestore()
    saveTeamCodereposSpy.mockRestore()
    doDeploymentSpy.mockRestore()
  })

  test('should delete an existing external public code repository', async () => {
    const coderepo = {
      id: '1',
      teamId: 'demo',
      label: 'code-1',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
    } as Coderepo

    jest.spyOn(otomiStack, 'getCoderepo').mockReturnValue(coderepo)
    const deleteItemSpy = jest.spyOn(otomiStack.db, 'deleteItem').mockResolvedValue({} as never)
    const saveTeamCodereposSpy = jest.spyOn(otomiStack, 'saveTeamCoderepos').mockResolvedValue()
    const doDeploymentSpy = jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()

    await otomiStack.deleteCoderepo('1')

    expect(deleteItemSpy).toHaveBeenCalledWith('coderepos', { id: '1' })
    expect(saveTeamCodereposSpy).toHaveBeenCalledWith('demo')
    expect(doDeploymentSpy).toHaveBeenCalledWith(['coderepos'])

    deleteItemSpy.mockRestore()
    saveTeamCodereposSpy.mockRestore()
    doDeploymentSpy.mockRestore()
  })

  test('should create an external private code repository', async () => {
    const createItemSpy = jest.spyOn(otomiStack.db, 'createItem').mockReturnValue({
      teamId: 'demo',
      label: 'code-1',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
      private: true,
      secret: 'test',
    } as Coderepo)

    const saveTeamCodereposSpy = jest.spyOn(otomiStack, 'saveTeamCoderepos').mockResolvedValue()
    const doDeploymentSpy = jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()

    const coderepo = await otomiStack.createCoderepo('demo', {
      label: 'code-1',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
      private: true,
      secret: 'test',
    })

    expect(coderepo).toEqual({
      teamId: 'demo',
      label: 'code-1',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
      private: true,
      secret: 'test',
    })
    expect(createItemSpy).toHaveBeenCalledWith(
      'coderepos',
      {
        teamId: 'demo',
        label: 'code-1',
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
        private: true,
        secret: 'test',
      },
      { teamId: 'demo', label: 'code-1' },
    )
    expect(saveTeamCodereposSpy).toHaveBeenCalledWith('demo')
    expect(doDeploymentSpy).toHaveBeenCalledWith(['coderepos'])

    createItemSpy.mockRestore()
    saveTeamCodereposSpy.mockRestore()
    doDeploymentSpy.mockRestore()
  })

  test('should get an existing external private code repository', () => {
    const coderepo = {
      id: '1',
      teamId: 'demo',
      label: 'code-1',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
      private: true,
      secret: 'test',
    } as Coderepo

    jest.spyOn(otomiStack.db, 'getItem').mockReturnValue(coderepo)

    const result = otomiStack.getCoderepo('1')
    expect(result).toEqual(coderepo)
  })

  test('should edit an existing external private code repository', async () => {
    const updateItemSpy = jest.spyOn(otomiStack.db, 'updateItem').mockReturnValue({
      id: '1',
      teamId: 'demo',
      label: 'code-1-updated',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
      private: true,
      secret: 'test',
    } as Coderepo)

    const saveTeamCodereposSpy = jest.spyOn(otomiStack, 'saveTeamCoderepos').mockResolvedValue()
    const doDeploymentSpy = jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()

    const coderepo = await otomiStack.editCoderepo('1', {
      teamId: 'demo',
      label: 'code-1-updated',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
      private: true,
      secret: 'test',
    })

    expect(coderepo).toEqual({
      id: '1',
      teamId: 'demo',
      label: 'code-1-updated',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
      private: true,
      secret: 'test',
    })
    expect(updateItemSpy).toHaveBeenCalledWith(
      'coderepos',
      {
        teamId: 'demo',
        label: 'code-1-updated',
        gitService: 'github',
        repositoryUrl: 'https://github.test.com',
        private: true,
        secret: 'test',
      },
      { id: '1' },
    )
    expect(saveTeamCodereposSpy).toHaveBeenCalledWith('demo')
    expect(doDeploymentSpy).toHaveBeenCalledWith(['coderepos'])

    updateItemSpy.mockRestore()
    saveTeamCodereposSpy.mockRestore()
    doDeploymentSpy.mockRestore()
  })

  test('should delete an existing external private code repository', async () => {
    const coderepo = {
      id: '1',
      teamId: 'demo',
      label: 'code-1',
      gitService: 'github',
      repositoryUrl: 'https://github.test.com',
      private: true,
      secret: 'test',
    } as Coderepo

    jest.spyOn(otomiStack, 'getCoderepo').mockReturnValue(coderepo)
    const deleteItemSpy = jest.spyOn(otomiStack.db, 'deleteItem').mockResolvedValue({} as never)
    const saveTeamCodereposSpy = jest.spyOn(otomiStack, 'saveTeamCoderepos').mockResolvedValue()
    const doDeploymentSpy = jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()

    await otomiStack.deleteCoderepo('1')

    expect(deleteItemSpy).toHaveBeenCalledWith('coderepos', { id: '1' })
    expect(saveTeamCodereposSpy).toHaveBeenCalledWith('demo')
    expect(doDeploymentSpy).toHaveBeenCalledWith(['coderepos'])

    deleteItemSpy.mockRestore()
    saveTeamCodereposSpy.mockRestore()
    doDeploymentSpy.mockRestore()
  })
})
