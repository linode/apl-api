import { expect } from 'chai'
import { stub as sinonStub } from 'sinon'
import { App, User, Workload } from 'src/otomi-models'
import OtomiStack from 'src/otomi-stack'
import { Repo } from 'src/repo'
import 'src/test-init'

describe('Data validation', () => {
  let otomiStack: OtomiStack
  beforeEach(async () => {
    otomiStack = new OtomiStack()
    await otomiStack.init()
  })

  it('should throw exception on duplicated domain', (done) => {
    const svc = { name: 'svc', ingress: { domain: 'a.com', subdomain: 'b' } }
    const svc1 = { ...svc }
    otomiStack.createService('aa', svc)
    expect(() => otomiStack.checkPublicUrlInUse(svc1)).to.throw
    done()
  })
  it('should throw exception on duplicated url with path', (done) => {
    const svc = { name: 'svc', ingress: { domain: 'a.com', subdomain: 'b', path: '/test/' } }
    otomiStack.createService('aa', svc)
    expect(() => otomiStack.checkPublicUrlInUse(svc)).to.throw
    done()
  })
  it('should not throw exception on unique url', (done) => {
    const svc1 = { name: 'svc', ingress: { domain: 'a.com', subdomain: 'b', path: '/test/' } }
    otomiStack.createService('aa', svc1)
    const svc2 = { name: 'svc', ingress: { domain: 'a.com', subdomain: 'b' } }
    const svc3 = { name: 'svc', ingress: { domain: 'a.com', subdomain: 'b', path: '/bla' } }
    expect(() => otomiStack.checkPublicUrlInUse(svc2)).to.not.throw
    expect(() => otomiStack.checkPublicUrlInUse(svc3)).to.not.throw
    done()
  })
  it('should not throw exception when of type cluster', (done) => {
    const svc = { name: 'svc', type: 'cluster', ingress: { domain: 'a.com', subdomain: 'b', path: '/test/' } }
    otomiStack.createService('aa', svc)
    expect(() => otomiStack.checkPublicUrlInUse(svc)).to.not.throw
    done()
  })
  it('should not throw exception when editing', (done) => {
    const svc = { id: 'x1', name: 'svc', ingress: { domain: 'a.com', subdomain: 'b', path: '/test/' } }
    otomiStack.createService('aa', svc)
    const svc1 = { id: 'x1', name: 'svc', ingress: { domain: 'a.com', subdomain: 'c' } }
    expect(() => otomiStack.checkPublicUrlInUse(svc1)).to.not.throw
    done()
  })
  it('should create a password when password is not specified', (done) => {
    const stub = sinonStub(otomiStack.db, 'createItem')
    otomiStack.createTeam({ name: 'test' })
    expect(stub.getCall(0).args[1].password).to.not.be.empty
    done()
  })
  it('should not create a password when password is specified', (done) => {
    const stub = sinonStub(otomiStack.db, 'createItem')
    const myPassword = 'someAwesomePassword'
    otomiStack.createTeam({ name: 'test', password: myPassword })
    expect(stub.getCall(0).args[1].password).to.equal(myPassword)
    done()
  })
})

describe('Work with values', () => {
  let otomiStack: OtomiStack
  beforeEach(() => {
    otomiStack = new OtomiStack()
    otomiStack.repo = new Repo('./test', undefined, 'someuser', 'some@ema.il', undefined, undefined)
  })

  it('can load from configuration to database and back', () => {
    expect(otomiStack.loadValues()).to.not.throw
  })
})

describe('Workload values', () => {
  let otomiStack: OtomiStack
  beforeEach(() => {
    otomiStack = new OtomiStack()
    otomiStack.repo = new Repo('./test', undefined, 'someuser', 'some@ema.il', undefined, undefined)
  })

  it('can load workload values (empty dict)', async () => {
    const w: Workload = { id: '1', teamId: '2', name: 'name', url: 'https://test.local' }

    otomiStack.repo.fileExists = sinonStub().returns(true)
    otomiStack.repo.readFile = sinonStub().returns({})
    const res = await otomiStack.loadWorkloadValues(w)
    expect(res).to.deep.equal({ id: '1', teamId: '2', name: 'name', values: {} })
  })
  it('can load workload values (dict)', async () => {
    const w: Workload = { id: '1', teamId: '2', name: 'name', url: 'https://test.local' }

    otomiStack.repo.fileExists = sinonStub().returns(true)
    otomiStack.repo.readFile = sinonStub().returns({ values: 'test: 1' })
    const res = await otomiStack.loadWorkloadValues(w)
    expect(res).to.deep.equal({ id: '1', teamId: '2', name: 'name', values: { test: 1 } })
  })

  it('can load workload values (empty string)', async () => {
    const w: Workload = { id: '1', teamId: '2', name: 'name', url: 'https://test.local' }

    otomiStack.repo.fileExists = sinonStub().returns(true)
    otomiStack.repo.readFile = sinonStub().returns({ values: '' })
    const res = await otomiStack.loadWorkloadValues(w)
    expect(res).to.deep.equal({ id: '1', teamId: '2', name: 'name', values: {} })
  })

  it('returns filtered apps if App array is submitted isPreinstalled flag is true', () => {
    const apps: App[] = [
      {
        id: 'external-dns',
      },
      {
        id: 'drone',
      },
      {
        id: 'cnpg',
      },
      {
        id: 'loki',
      },
    ]
    otomiStack.getSettingsInfo = sinonStub().returns({ otomi: { isPreInstalled: true } })
    const filteredApps = otomiStack.filterExcludedApp(apps)

    expect(filteredApps).to.deep.equal([
      {
        id: 'cnpg',
      },
      {
        id: 'loki',
      },
    ] as App[])
  })

  it('returns app with managed = true if single App is in excludedList and isPreinstalled flag is true', () => {
    const app: App = {
      id: 'external-dns',
    }
    otomiStack.getSettingsInfo = sinonStub().returns({ otomi: { isPreInstalled: true } })
    const filteredApp = otomiStack.filterExcludedApp(app)
    expect(filteredApp).to.deep.equal({ id: 'external-dns', managed: true })
  })
})

describe('Users tests', () => {
  let otomiStack: OtomiStack
  let dbStub: any
  let settingsStub: any
  const domainSuffix = 'local.host'

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

    dbStub = sinonStub(otomiStack, 'db').value({
      getItem: sinonStub().callsFake((collection, query) => {
        return [defaultPlatformAdmin, anyPlatformAdmin].find((user) => user.id === query.id)
      }),
      deleteItem: sinonStub().returns(true),
    })
    settingsStub = sinonStub(otomiStack, 'getSettings').returns({
      cluster: { domainSuffix },
    })
  })

  afterEach(() => {
    dbStub.restore()
    settingsStub.restore()
  })

  it('should not allow deleting the default platform admin user', () => {
    try {
      otomiStack.deleteUser('1')
    } catch (error) {
      expect(error.code).to.equal(403)
      expect(error.publicMessage).to.equal('Cannot delete the default platform admin user')
    }
  })

  it('should allow deleting any other platform admin user', () => {
    try {
      otomiStack.deleteUser('2')
    } catch (error) {
      expect(error).to.be.undefined
    }
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
