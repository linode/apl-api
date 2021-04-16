import { expect } from 'chai'
import { appendFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import cloneRepo, { initRepo, initRepoBare, Repo } from './repo'

describe('Repo scenarios', () => {
  let r1: Repo
  let r2: Repo
  const bareRepoPath = '/tmp/test-r0-bare'
  const repo1Path = '/tmp/test-r1'
  const repo2Path = '/tmp/test-r2'
  const testFile = 'test.txt'
  beforeEach(async () => {
    await initRepoBare(bareRepoPath)

    r1 = await initRepo(repo1Path, bareRepoPath, 'test', 'test@test.test', 'pass', 'main', 'file')
    appendFileSync(join(repo1Path, testFile), 'AAA')
    await r1.git.add(testFile)
    await r1.git.commit('initial value')
    await r1.git.push('origin', 'main')
    r2 = await cloneRepo(repo2Path, bareRepoPath, 'test', 'test@test.test', 'pass', 'main', 'file')
  })

  afterEach(() => {
    execSync(`rm -rf /tmp/test-r*`)
  })

  it.skip('should throw on git conflict', async () => {
    const sha = await r1.getCommitSha()
    appendFileSync(join(r1.path, testFile), 'AAB')
    await r1.git.add(testFile)
    await r1.git.commit('initial value')
    await r1.git.push('origin', 'main')
    appendFileSync(join(r2.path, testFile), 'ABA')
    try {
      await r2.save('')
    } catch (error) {
      // empty
    }

    const sha2 = await r2.getCommitSha()
    expect(sha).be.equal(sha2)
    const status = await r2.git.status()
    expect(status.isClean()).be.true
  })
})
