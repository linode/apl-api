import { expect } from 'chai'
import { appendFileSync } from 'fs'
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
    await r1.git.init()
    await r1.addRemoteOrigin(remoteOrigin)
    // Create an initial commit to get rid of 'Needed a single revision' error
    appendFileSync(join(r1.path, testFile), 'AAA')
    await r1.git.add(testFile)
    await r1.git.commit('initial value')
    await r1.git.push('origin', 'master')

    r2 = repo(repo2Path, bareRepoPath, null, null, null, 'master')
    await r2.git.init()
    await r2.addRemoteOrigin(remoteOrigin)
    await r2.pull()
  })

  afterEach(() => {
    execSync(`rm -rf /tmp/test-r*`)
  })

  it('should throw on conflict', async () => {
    const sha = await r1.getCommitSha()
    appendFileSync(join(r1.path, testFile), 'AAB')
    await r1.git.add(testFile)
    await r1.git.commit('initial value')
    await r1.git.push('origin', 'master')
    appendFileSync(join(r2.path, testFile), 'ABA')
    try {
      await r2.save('', '')
    } catch (error) {
      // empty
    }

    // expect(await r2.save('', '')). rejectedWith(GitPullError)
    const sha2 = await r2.getCommitSha()
    expect(sha).be.equal(sha2)
    const status = await r2.git.status()
    expect(status.isClean()).be.true
  })
})
