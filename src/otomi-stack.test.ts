/* eslint-disable @typescript-eslint/no-empty-function */
import { App, User, Workload } from 'src/otomi-models'
import OtomiStack from 'src/otomi-stack'
import { Repo } from 'src/repo'
import { mockDeep } from 'jest-mock-extended'
import { PublicUrlExists } from './error'
import * as getValuesSchemaModule from './utils'

beforeAll(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'debug').mockImplementation(() => {})
  jest.spyOn(console, 'info').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})

  jest.spyOn(getValuesSchemaModule, 'getValuesSchema').mockResolvedValue({})

  const { loadSpec } = await import('src/app') // Dynamic import
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

  test('should throw exception on duplicated domain', () => {
    const svc = { name: 'svc', ingress: { domain: 'a.com', subdomain: 'b' } }
    const svc1 = { ...svc }
    otomiStack.createService('aa', svc)
    expect(() => otomiStack.checkPublicUrlInUse(svc1)).toThrow(new PublicUrlExists())
  })

  test('should throw exception on duplicated url with path', () => {
    const svc = { name: 'svc', ingress: { domain: 'a.com', subdomain: 'b', paths: ['/test/'] } }
    otomiStack.createService('aa', svc)
    expect(() => otomiStack.checkPublicUrlInUse(svc)).toThrow(new PublicUrlExists())
  })

  test('should not throw exception on unique url', () => {
    const svc1 = { name: 'svc', ingress: { domain: 'a.com', subdomain: 'b', paths: ['/test/'] } }
    otomiStack.createService('aa', svc1)
    const svc2 = { name: 'svc', ingress: { domain: 'a.com', subdomain: 'b' } }
    const svc3 = { name: 'svc', ingress: { domain: 'a.com', subdomain: 'b', paths: ['/bla'] } }
    expect(() => otomiStack.checkPublicUrlInUse(svc2)).not.toThrow()
    expect(() => otomiStack.checkPublicUrlInUse(svc3)).not.toThrow()
  })

  test('should not throw exception when of type cluster', () => {
    const svc = { name: 'svc', ingress: { type: 'cluster' } }
    // @ts-ignore
    otomiStack.createService('aa', svc)
    expect(() => otomiStack.checkPublicUrlInUse(svc)).not.toThrow()
  })

  test('should not throw exception when editing', () => {
    const svc = { id: 'x1', name: 'svc', ingress: { domain: 'a.com', subdomain: 'b', paths: ['/test/'] } }
    otomiStack.createService('aa', svc)
    const svc1 = { id: 'x1', name: 'svc', ingress: { domain: 'a.com', subdomain: 'c' } }
    expect(() => otomiStack.checkPublicUrlInUse(svc1)).not.toThrow()
  })

  test('should create a password when password is not specified', () => {
    const createItemSpy = jest.spyOn(otomiStack.db, 'createItem')
    otomiStack.createTeam({ name: 'test' })
    expect(createItemSpy.mock.calls[0][1].password).not.toEqual('')
    createItemSpy.mockRestore()
  })

  test('should not create a password when password is specified', () => {
    const createItemSpy = jest.spyOn(otomiStack.db, 'createItem')
    const myPassword = 'someAwesomePassword'
    otomiStack.createTeam({ name: 'test', password: myPassword })
    expect(createItemSpy.mock.calls[0][1].password).toEqual(myPassword)
    createItemSpy.mockRestore()
  })
})

describe('Work with values', () => {
  let otomiStack: OtomiStack
  beforeEach(() => {
    otomiStack = new OtomiStack()
    otomiStack.init()
    otomiStack.repo = new Repo('./test', undefined, 'someuser', 'some@ema.il', undefined, undefined)
    jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()
  })

  test('can load from configuration to database and back', () => {
    expect(() => otomiStack.loadValues()).not.toThrow()
  })
})

describe('Workload values', () => {
  let otomiStack: OtomiStack
  beforeEach(() => {
    otomiStack = new OtomiStack()
    otomiStack.init()
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
  let dbStub: any
  let settingsStub: jest.SpyInstance
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

    dbStub = {
      getItem: jest.fn((collection, query) => {
        return [defaultPlatformAdmin, anyPlatformAdmin].find((user) => user.id === query.id)
      }),
      deleteItem: jest.fn().mockReturnValue(true),
    }
    otomiStack.db = dbStub
    settingsStub = jest.spyOn(otomiStack, 'getSettings').mockReturnValue({ cluster: { domainSuffix } })
    jest.spyOn(otomiStack, 'saveUsers').mockResolvedValue()
    jest.spyOn(otomiStack, 'doDeployment').mockResolvedValue()
  })

  afterEach(() => {
    settingsStub.mockRestore()
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

  it('should not create a user with less than 3 characters', () => {
    try {
      otomiStack.createUser({ email: 'a@b.c', firstName: 'a', lastName: 'b' })
    } catch (error) {
      expect(error.code).to.equal(400)
      expect(error.publicMessage).to.equal(
        'Username (the part of the email before "@") must be between 3 and 30 characters.',
      )
    }
  })

  it('should not create a user with more than 30 characters', () => {
    try {
      otomiStack.createUser({ email: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@b.c', firstName: 'a', lastName: 'b' })
    } catch (error) {
      expect(error.code).to.equal(400)
      expect(error.publicMessage).to.equal(
        'Username (the part of the email before "@") must be between 3 and 30 characters.',
      )
    }
  })

  it('should not create a user if the username starts with non-alphanumeric characters', () => {
    try {
      otomiStack.createUser({ email: '-abc@b.c', firstName: 'a', lastName: 'b' })
    } catch (error) {
      expect(error.code).to.equal(400)
      expect(error.publicMessage).to.equal('Invalid username (the part of the email before "@") format.')
    }
  })

  it('should not create a user if the username ends with non-alphanumeric characters', () => {
    try {
      otomiStack.createUser({ email: 'abc-@b.c', firstName: 'a', lastName: 'b' })
    } catch (error) {
      expect(error.code).to.equal(400)
      expect(error.publicMessage).to.equal('Invalid username (the part of the email before "@") format.')
    }
  })

  it('should not create a user if the username includes consecutive non-alphanumeric characters', () => {
    try {
      otomiStack.createUser({ email: 'ab--c@b.c', firstName: 'a', lastName: 'b' })
    } catch (error) {
      expect(error.code).to.equal(400)
      expect(error.publicMessage).to.equal('Invalid username (the part of the email before "@") format.')
    }
  })

  it('should not create a user with gitea reserved usernames', () => {
    try {
      otomiStack.createUser({ email: 'user@b.c', firstName: 'a', lastName: 'b' })
    } catch (error) {
      expect(error.code).to.equal(400)
      expect(error.publicMessage).to.equal('This username (the part of the email before "@") is reserved.')
    }
  })

  it('should not create a user with keycloak root user username', () => {
    try {
      otomiStack.createUser({ email: 'otomi-admin@b.c', firstName: 'a', lastName: 'b' })
    } catch (error) {
      expect(error.code).to.equal(400)
      expect(error.publicMessage).to.equal('This username (the part of the email before "@") is reserved.')
    }
  })

  it('should not create a user with gitea reserved user patterns', () => {
    try {
      otomiStack.createUser({ email: 'a.keys@b.c', firstName: 'a', lastName: 'b' })
    } catch (error) {
      expect(error.code).to.equal(400)
      expect(error.publicMessage).to.equal(
        'Usernames (the part of the email before "@") ending with .keys, .gpg, .rss, or .atom are not allowed.',
      )
    }
  })
})
