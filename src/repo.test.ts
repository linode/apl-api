import { expect } from 'chai'
import { removeSync, appendFileSync } from 'fs-extra'
import { join } from 'path'
import { execSync } from 'child_process'
import repo, { Repo, createBareRepo } from './repo'

describe('Repo scenarios', () => {
  let r1: Repo
  let r2: Repo
  const bareRepoPath = '/tmp/test-r0-bare'
  const remoteOrigin = `file://${bareRepoPath}`
  const repo1Path = '/tmp/test-r1'
  const repo2Path = '/tmp/test-r2'
  const testFile = 'test.txt'
  beforeEach(async () => {
    await createBareRepo(bareRepoPath)
    r1 = repo(repo1Path, bareRepoPath, null, null, null, 'master')
    r1.git.init()
    r1.addRemoteOrigin(remoteOrigin)
    r2 = repo(repo2Path, repo2Path, null, null, null, 'master')
    r2.git.init()
    r2.addRemoteOrigin(remoteOrigin)
  })

  afterEach(() => {
    // execSync(`rm -rf ${repo1Path}`)
    // execSync(`rm -rf ${repo2Path}`)
    // execSync(`rm -rf ${bareRepoPath}`)
  })

  it('should throw on conflict', async () => {
    appendFileSync(join(r1.path, testFile), 'AAA')
    r1.save('', '')
    // const sha = await r1.getCommitSha()
    r2.pull()
    appendFileSync(join(r1.path, testFile), 'AAB')
    r1.save('', '')
    appendFileSync(join(r2.path, testFile), 'ABA')
    expect(() => r2.save('', '')).to.throw
    // const sha2 = await r2.getCommitSha()
    // expect(sha).be.equal(sha2)
  })
})
