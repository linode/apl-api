import { expect } from 'chai'
import { getPublicUrl } from './utils'

describe('Utils', function () {
  it('should retrieve host part from service domain', function (done) {
    const x = getPublicUrl('aa.bb.cc.dd.ee', null, null, { dnsZones: ['dd.ee'] })
    expect(x.subdomain).to.equal('aa.bb.cc')
    done()
  })

  it('should retrieve only domain', function (done) {
    const x = getPublicUrl('my.custom.domain', null, null, { dnsZones: ['dd.ee'] })
    expect(x.subdomain).to.be.empty
    expect(x.domain).to.equal('my.custom.domain')
    done()
  })
  it('should retrieve default host if service domain not defined', function (done) {
    const x = getPublicUrl(undefined, 'aa', 'bb', { dnsZones: ['dd.ee'] })
    expect(x.subdomain).to.equal('aa.team-bb')
    expect(x.domain).to.equal('dd.ee')
    done()
  })
  it('should retrieve host and domain part from service domai (many dnsZones)n', function (done) {
    const x = getPublicUrl('aa.bb.cc.dd.ee', 'aa', 'bb', { dnsZones: ['cc.dd.ee', 'dd.ee', 'bb.cc.dd.ee'] })
    expect(x.subdomain).to.equal('aa')
    expect(x.domain).to.equal('bb.cc.dd.ee')
    done()
  })
})
