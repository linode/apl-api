const expect = require('chai').expect
const utils = require('./utils')

describe('Utils', function () {
  beforeEach(function () {})

  it('should retrieve host part from service domain', function (done) {
    const x = utils.getPublicUrl('aa.bb.cc.dd.ee', null, null, { dnsZone: 'dd.ee' })
    expect(x.subdomain).to.equal('aa.bb.cc')
    done()
  })

  it('should retrieve only domain', function (done) {
    const x = utils.getPublicUrl('my.custom.domain', null, null, { dnsZone: 'dd.ee' })
    expect(x.subdomain).to.be.empty
    expect(x.domain).to.equal('my.custom.domain')
    done()
  })
  it('should retrieve default host if service domain not defined', function (done) {
    const x = utils.getPublicUrl(undefined, 'aa', 'bb', { cluster: 'cc', dnsZone: 'dd.ee' })
    expect(x.subdomain).to.equal('aa.team-bb.cc')
    expect(x.domain).to.equal('dd.ee')
    done()
  })
})
