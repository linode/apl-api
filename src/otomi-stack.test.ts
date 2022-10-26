import { expect } from 'chai'
import sinon from 'sinon'
import OtomiStack from 'src/otomi-stack'
import { Repo } from 'src/repo'
import 'src/test-init'

describe('Data validation', () => {
  let otomiStack: OtomiStack
  beforeEach(() => {
    otomiStack = new OtomiStack()
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
    const stub = sinon.stub(otomiStack.db, 'createItem')
    otomiStack.createTeam({ name: 'test' })
    expect(stub.getCall(0).args[1].password).to.not.be.empty
    done()
  })
  it('should not create a password when password is specified', (done) => {
    const stub = sinon.stub(otomiStack.db, 'createItem')
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
    otomiStack.repo = new Repo('./test', undefined, undefined, undefined, undefined, undefined)
  })

  it('can load from configuration to database and back', () => {
    expect(otomiStack.loadValues()).to.not.throw
    expect(otomiStack.saveValues()).to.not.throw
  })
  return undefined
})
