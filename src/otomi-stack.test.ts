/* eslint-disable @typescript-eslint/ban-ts-comment */
// import './test-init'
import { expect } from 'chai'
import OtomiStack from './otomi-stack'

describe('Data validation', () => {
  let otomiStack: OtomiStack
  beforeEach(() => {
    otomiStack = new OtomiStack()
  })

  it('should throw exception on duplicated domain', (done) => {
    const svc = { name: 'svc', ingress: { domain: 'a.com', subdomain: 'b' } }
    const svc1 = { ...svc }
    otomiStack.createService('A', svc)
    expect(() => otomiStack.checkPublicUrlInUse(svc1)).to.be.throw
    done()
  })
  it('should throw exception on duplicated url with path', (done) => {
    const svc = { name: 'svc', ingress: { domain: 'a.com', subdomain: 'b', path: '/test/' } }
    const svc1 = { ...svc }
    otomiStack.createService('A', svc)
    expect(() => otomiStack.checkPublicUrlInUse(svc1)).to.be.throw
    done()
  })
  it('should not throw exception on unique url', (done) => {
    const svc = { name: 'svc', ingress: { domain: 'a.com', subdomain: 'b', path: '/test/' } }
    otomiStack.createService('A', svc)
    const svc1 = { name: 'svc', ingress: { domain: 'a.com', subdomain: 'c' } }
    expect(() => otomiStack.checkPublicUrlInUse(svc1)).to.not.be.throw
    done()
  })
})
