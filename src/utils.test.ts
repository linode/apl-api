import { expect } from 'chai'
import { getObjectPaths, getPublicUrl, getTeamSecretsFilePath, getTeamSecretsJsonPath } from './utils'

describe('Utils', () => {
  it('should retrieve host part from service domain', (done) => {
    const x = getPublicUrl('aa.bb.cc.dd.ee', undefined, undefined, {
      domain: 'dev.otomi.cloud',
      dnsZones: ['dd.ee'],
      aws: { region: 'r' },
    })
    expect(x.subdomain).to.equal('aa.bb.cc')
    done()
  })

  it('should retrieve only domain', (done) => {
    const x = getPublicUrl('my.custom.domain', undefined, undefined, {
      domain: 'aa.otomi.cloud',
      dnsZones: ['dd.ee'],
      aws: { region: 'r' },
    })
    expect(x.subdomain).to.be.empty
    expect(x.domain).to.equal('my.custom.domain')
    done()
  })
  it('should retrieve default host if service domain not defined', (done) => {
    const x = getPublicUrl(undefined, 'aa', 'bb', {
      domain: 'dev.otomi.cloud',
      dnsZones: ['dd.ee'],
      aws: { region: 'r' },
    })
    expect(x.subdomain).to.equal('aa.team-bb')
    expect(x.domain).to.equal('dev.otomi.cloud')
    done()
  })
  it('should retrieve host and domain part from service domai (many dnsZones)n', (done) => {
    const x = getPublicUrl('aa.bb.cc.dd.ee', 'aa', 'bb', {
      domain: 'dev.otomi.cloud',
      dnsZones: ['cc.dd.ee', 'dd.ee', 'bb.cc.dd.ee'],
      aws: { region: 'r' },
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
    expect(getTeamSecretsJsonPath('dev')).to.equal('teamConfig.teams.dev.externalSecrets')
    done()
  })
  it('should return proper file path to team secrets', (done) => {
    expect(getTeamSecretsFilePath('dev')).to.equal('./env/teams/external-secrets.dev.yaml')
    done()
  })
})
