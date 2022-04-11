import { expect } from 'chai'
import { Cluster } from './otomi-models'
import { getServiceUrl } from './utils'

describe('Utils', () => {
  const cluster: Cluster = {
    domainSuffix: 'dev.otomi.cloud',
    apiName: 'onprem',
    apiServer: 'apiServer.onprem.example.com',
    k8sVersion: '1.19',
    name: 'dev',
    provider: 'custom',
    region: 'eu-central-1',
  }
  const dns = {
    aws: { region: 'r' },
  }

  it('should retrieve host part from service domain', (done) => {
    const x = getServiceUrl({ domain: 'aa.bb.cc.dd.ee', cluster, dns: { ...dns, zones: ['dd.ee'] } })
    expect(x.subdomain).to.equal('aa.bb.cc')
    done()
  })

  it('should retrieve only domain', (done) => {
    const x = getServiceUrl({ domain: 'my.custom.domain', cluster, dns: { ...dns, zones: ['dd.ee'] } })
    expect(x.subdomain).to.be.empty
    expect(x.domain).to.equal('my.custom.domain')
    done()
  })
  it('should retrieve default host if service domain not defined', (done) => {
    const x = getServiceUrl({ name: 'aa', teamId: 'bb', cluster, dns: { ...dns, zones: ['dd.ee'] } })
    expect(x.subdomain).to.equal('aa.team-bb')
    expect(x.domain).to.equal('dev.otomi.cloud')
    done()
  })
  it('should retrieve host and domain part from service domai (many zones)n', (done) => {
    const x = getServiceUrl({
      domain: 'aa.bb.cc.dd.ee',
      name: 'aa',
      teamId: 'bb',
      cluster,
      dns: { ...dns, zones: ['cc.dd.ee', 'dd.ee', 'bb.cc.dd.ee'] },
    })
    expect(x.subdomain).to.equal('aa')
    expect(x.domain).to.equal('bb.cc.dd.ee')
    done()
  })
})
