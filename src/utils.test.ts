import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'fs'
import os from 'os'
import path from 'path'
import { Cluster } from 'src/otomi-models'
import { getSanitizedErrorMessage, getServiceUrl, safeReadTextFile, sanitizeGitPassword } from 'src/utils'
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

  describe('safeReadTextFile', () => {
    let tmpRoot: string
    let baseDir: string
    let outsideDir: string

    beforeEach(() => {
      tmpRoot = mkdtempSync(path.join(os.tmpdir(), 'safe-read-'))
      baseDir = path.join(tmpRoot, 'repo')
      outsideDir = path.join(tmpRoot, 'outside')

      mkdirSync(baseDir, { recursive: true })
      mkdirSync(outsideDir, { recursive: true })
    })

    afterEach(() => {
      rmSync(tmpRoot, { recursive: true, force: true })
    })

    test('reads a regular file inside baseDir', async () => {
      const filePath = path.join(baseDir, 'README.md')
      writeFileSync(filePath, 'hello', 'utf-8')

      await expect(safeReadTextFile(baseDir, filePath)).resolves.toBe('hello')
    })

    test('rejects symlink explicitly', async () => {
      const outsideTarget = path.join(outsideDir, 'secret.txt')
      writeFileSync(outsideTarget, 'nope', 'utf-8')

      const linkPath = path.join(baseDir, 'README.md')
      symlinkSync(outsideTarget, linkPath)

      await expect(safeReadTextFile(baseDir, linkPath)).rejects.toThrow(`Refusing to read symlink: ${linkPath}`)
    })

    test('rejects paths that resolve outside baseDir', async () => {
      const outsideFile = path.join(outsideDir, 'config.yaml')
      writeFileSync(outsideFile, 'topsecret', 'utf-8')

      await expect(safeReadTextFile(baseDir, outsideFile)).rejects.toThrow(/Refusing to read outside repo:/)
    })

    test('rejects symlink even if it points inside baseDir', async () => {
      const realFile = path.join(baseDir, 'real.txt')
      writeFileSync(realFile, 'inside', 'utf-8')

      const linkPath = path.join(baseDir, 'link.txt')
      symlinkSync(realFile, linkPath)

      await expect(safeReadTextFile(baseDir, linkPath)).rejects.toThrow(`Refusing to read symlink: ${linkPath}`)
    })
  })
})
