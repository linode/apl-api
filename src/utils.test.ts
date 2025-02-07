import { Cluster } from 'src/otomi-models'
import { getServiceUrl } from 'src/utils'

describe('Utils', () => {
  const cluster: Cluster = {
    domainSuffix: 'dev.otomi.cloud',
    apiServer: 'apiServer.onprem.example.com',
    name: 'dev',
    provider: 'custom',
  }
  const dns = {
    aws: { region: 'r' },
  }

  test('should retrieve host part from service domain', () => {
    const x = getServiceUrl({ domain: 'aa.bb.cc.dd.ee', cluster, dns: { ...dns, zones: ['dd.ee'] } })
    expect(x.subdomain).toEqual('aa.bb.cc')
  })

  test('should retrieve only domain', () => {
    const x = getServiceUrl({ domain: 'my.custom.domain', cluster, dns: { ...dns, zones: ['dd.ee'] } })
    expect(x.subdomain).toEqual('')
    expect(x.domain).toEqual('my.custom.domain')
  })

  test('should retrieve default host if service domain not defined', () => {
    const x = getServiceUrl({ name: 'aa', teamId: 'bb', cluster, dns: { ...dns, zones: ['dd.ee'] } })
    expect(x.subdomain).toEqual('aa-bb')
    expect(x.domain).toEqual('dev.otomi.cloud')
  })

  test('should retrieve host and domain part from service domain (many zones)', () => {
    const x = getServiceUrl({
      domain: 'aa.bb.cc.dd.ee',
      name: 'aa',
      teamId: 'bb',
      cluster,
      dns: { ...dns, zones: ['cc.dd.ee', 'dd.ee', 'bb.cc.dd.ee'] },
    })
    expect(x.subdomain).toEqual('aa')
    expect(x.domain).toEqual('bb.cc.dd.ee')
  })
})
