import { Cluster } from 'src/otomi-models'
import { getSanitizedErrorMessage, getServiceUrl, sanitizeGitPassword } from 'src/utils'
import { cleanEnv, GIT_PASSWORD } from './validators'

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

  describe('sanitizeGitPassword should remove git credentials', () => {
    const env = cleanEnv({
      GIT_PASSWORD,
    })
    test('from strings', () => {
      expect(sanitizeGitPassword('test string')).toBe('test string')
      expect(sanitizeGitPassword(`${env.GIT_PASSWORD} test string ${env.GIT_PASSWORD}`)).toBe('**** test string ****')
    })
    test('from objects', () => {
      expect(sanitizeGitPassword(JSON.stringify({ test: 'some string' }))).toEqual('{"test":"some string"}')
      expect(sanitizeGitPassword(JSON.stringify({ test: `some string ${env.GIT_PASSWORD}` }))).toEqual(
        '{"test":"some string ****"}',
      )
    })
    test('return empty string on empty or undefined input', () => {
      expect(sanitizeGitPassword('')).toEqual('')
      expect(sanitizeGitPassword(undefined)).toEqual('')
    })
    test('extract message from exception', () => {
      expect(getSanitizedErrorMessage(new Error('test error'))).toEqual('test error')
      expect(getSanitizedErrorMessage(new Error(`test error ${env.GIT_PASSWORD}`))).toEqual('test error ****')
    })
  })
})
