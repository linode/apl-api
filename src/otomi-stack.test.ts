/* eslint-disable @typescript-eslint/ban-ts-comment */
import './test-init'
import { expect } from 'chai'
import OtomiStack from './otomi-stack'
import { Repo } from './repo'

describe('Settings', () => {
  const otomi = new OtomiStack()
  otomi.repo = new Repo('./test', undefined, undefined, undefined, undefined, undefined)

  it('should assign a dummy payload', () => {
    const settings = otomi.getSettings()
    const payload: any = {
      ...settings,
      alerts: {
        drone: 'someTeamChat',
      },
    }

    expect(otomi.editSettings(payload)).to.deep.equal(payload)
  })
})

describe('Data validation', () => {
  let otomiStack
  beforeEach(() => {
    otomiStack = new OtomiStack()
  })

  it('should throw exception on duplicated domain', (done) => {
    const svc = { serviceId: 's/A', ingress: { domain: 'a.com', subdomain: 'b' } }
    const svc1 = { ...svc }
    otomiStack.db.createItem('services', { teamId: 'A' }, svc)
    const check = otomiStack.checkPublicUrlInUse(svc1)
    expect(check).to.be.throw
    done()
  })
  it('should throw exception on duplicated url with path', (done) => {
    const svc = { serviceId: 's/A', ingress: { domain: 'a.com', subdomain: 'b', path: '/test/' } }
    const svc1 = { ...svc }
    otomiStack.db.createItem('services', { teamId: 'A' }, svc)
    const check = otomiStack.checkPublicUrlInUse(svc1)
    expect(check).to.be.throw
    done()
  })
  it('should not throw exception on unique url', (done) => {
    const svc = { serviceId: 's/A', ingress: { domain: 'a.com', subdomain: 'b', path: '/test/' } }
    otomiStack.db.createItem('services', { teamId: 'A' }, svc)
    const svc1 = { serviceId: 's/A', ingress: { domain: 'a.com', subdomain: 'c' } }
    const check = otomiStack.checkPublicUrlInUse(svc1)
    expect(check).to.be.undefined
    done()
  })
})
