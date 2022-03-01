import { expect } from 'chai'
import { Cluster } from './otomi-models'
import { getObjectPaths, getServiceUrl, getTeamSecretsFilePath, getTeamSecretsJsonPath } from './utils'

describe('Utils', () => {
  const cluster: Cluster = {
    domainSuffix: 'dev.otomi.cloud',
    apiName: 'onprem',
    apiServer: 'apiServer.onprem.example.com',
    k8sVersion: '1.19',
    name: 'dev',
    provider: 'onprem',
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

  it('should retrieve all object paths', (done) => {
    const obj = {
      a: 1,
      b: { bb: 2 },
      c: [{ ee: { fff: 3 } }, { ee: { fff: 4 } }],
      d: { dd: [1, 2] },
    }
    const paths = getObjectPaths(obj)
    expect(paths).to.have.members(['a', 'b.bb', 'c[0].ee.fff', 'c[1].ee.fff', 'd.dd[0]', 'd.dd[1]'])
    done()
  })
  it('should return proper json path to team secrets', (done) => {
    expect(getTeamSecretsJsonPath('dev')).to.equal('teamConfig.dev.secrets')
    done()
  })
  it('should return proper file path to team secrets', (done) => {
    expect(getTeamSecretsFilePath('dev')).to.equal('./env/teams/external-secrets.dev.yaml')
    done()
  })
})
