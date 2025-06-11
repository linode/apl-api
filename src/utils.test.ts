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
    const service = getServiceUrl({
      domain: 'aa.bb.cc.dd.ee',
      cluster,
      dns: { ...dns, zones: ['dd.ee'] },
      managedByKnative: false,
    })
    expect(service.subdomain).toEqual('aa.bb.cc')
  })

  test('should retrieve only domain', () => {
    const service = getServiceUrl({
      domain: 'my.custom.domain',
      cluster,
      dns: { ...dns, zones: ['dd.ee'] },
      managedByKnative: false,
    })
    expect(service.subdomain).toEqual('')
    expect(service.domain).toEqual('my.custom.domain')
  })

  test('should retrieve default host if service domain not defined', () => {
    const service = getServiceUrl({
      name: 'aa',
      teamId: 'bb',
      cluster,
      dns: { ...dns, zones: ['dd.ee'] },
      managedByKnative: false,
    })
    expect(service.subdomain).toEqual('aa-bb')
    expect(service.domain).toEqual('dev.otomi.cloud')
  })

  test('should retrieve host and domain part from service domain (many zones)', () => {
    const service = getServiceUrl({
      domain: 'aa.bb.cc.dd.ee',
      name: 'aa',
      teamId: 'bb',
      cluster,
      dns: { ...dns, zones: ['cc.dd.ee', 'dd.ee', 'bb.cc.dd.ee'] },
      managedByKnative: false,
    })
    expect(service.subdomain).toEqual('aa')
    expect(service.domain).toEqual('bb.cc.dd.ee')
  })
})
