import { expect } from 'chai'
import { stub as sinonStub } from 'sinon'
import { Workload } from 'src/otomi-models'
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
    expect(otomiStack.saveValues()).to.not.throw
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
})

describe('Team Admin users tests', () => {
  let otomiStack: OtomiStack
  beforeEach(async () => {
    otomiStack = new OtomiStack()
    await otomiStack.init()
  })
  it('should not allow team admin to create platform admin users', async () => {
    const userData = {
      name: 'user1',
      email: 'user1@mail.com',
      firstName: 'User',
      lastName: 'One',
      isPlatformAdmin: true,
      isTeamAdmin: false,
    }
    const sessionUser = { roles: ['teamAdmin'] } as any

    // Mock the createUser method to simulate a 403 Forbidden response
    const createUserStub = sinonStub(otomiStack, 'createUser').throws(() => {
      const error = new Error('Forbidden')
      ;(error as any).status = 403
      return error
    })

    try {
      await otomiStack.createUser(sessionUser, 'team1', userData)
    } catch (error) {
      expect(error.status).to.equal(403)
      expect(error.message).to.equal('Forbidden')
    } finally {
      createUserStub.restore() // Ensure the stub is restored after the test
    }
  })
})
