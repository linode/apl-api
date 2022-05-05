import { expect } from 'chai'
import sinon from 'sinon'
import expectedDbState from './fixtures/values'
import OtomiStack, { loadOpenApisSpec } from './otomi-stack'
import { Repo } from './repo'
import './test-init'

describe('Data validation', () => {
  let otomiStack: OtomiStack
  beforeEach(async () => {
    otomiStack = new OtomiStack()
    const [spec] = await loadOpenApisSpec()
    otomiStack.setSpec(spec)
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
  let spec
  let secretPaths
  before(async () => {
    const [inSpec, inSecretPaths] = await loadOpenApisSpec()
    spec = inSpec
    secretPaths = inSecretPaths
  })
  beforeEach(() => {
    otomiStack = new OtomiStack()
    otomiStack.setSpec(spec, secretPaths)
    otomiStack.repo = new Repo('./test', undefined, undefined, undefined, undefined, undefined)
  })

  it('can load from configuration to database', () => {
    otomiStack.loadValues()
    const dbState = otomiStack.db.db.getState() as Record<string, any>
    expect(dbState).to.deep.equal(expectedDbState)
  })
  it('can save database state to configuration files', () => {
    const results = {}
    function writeFileStub(path, data): void {
      results[path] = data
    }
    otomiStack.db.db.setState(expectedDbState)
    otomiStack.repo.writeFile = writeFileStub
    otomiStack.saveValues()
    Object.entries(results).forEach(([path, data]) => {
      if (!otomiStack.repo.fileExists(path)) return
      const expectedData = otomiStack.repo.readFile(path)
      expect(data, path).to.have.any.keys(expectedData)
    })
  })
  return undefined
})
