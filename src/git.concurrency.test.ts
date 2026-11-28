/**
 * Many concurrent API writes against a real git remote, using the real Git class and OtomiStack.requestSync.
 *
 * Per request it mirrors the publish flow: worktree at the newest local commit, write one file, save (commit + push),
 * remove the worktree. Meanwhile a periodic Root sync (like checkAgainstGit) and an external
 * writer (another pod / the operator) run. Takes ~40s, so it only runs via `npm run test:git-stress`.
 * Tune with GIT_STRESS_PARALLEL and GIT_STRESS_ROUNDS.
 */
import { mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { countBy } from 'lodash'
import { join } from 'path'
import { simpleGit } from 'simple-git'
import type { Git } from 'src/git'
import type OtomiStack from 'src/otomi-stack'

const base = join(tmpdir(), `apl-git-concurrency-${process.pid}`)
const remotePath = join(base, 'remote.git')
const rootPath = join(base, 'root')
const branch = 'main'
// Git.isRootClone() compares against GIT_LOCAL_PATH, read when src/git is first loaded
process.env.GIT_LOCAL_PATH = rootPath

const PARALLEL = Number(process.env.GIT_STRESS_PARALLEL ?? 20)
const ROUNDS = Number(process.env.GIT_STRESS_ROUNDS ?? 3)

type Failure = { where: string; message: string }
const firstLine = (e: unknown) =>
  (
    String((e as Error)?.message ?? e)
      .split('\n')
      .map((l) => l.trim())
      .find((l) => /error|fatal|cannot|could not|failed|need to|rejected|conflict/i.test(l)) ??
    String((e as Error)?.message ?? e).trim()
  )
    .replace(base, '<tmp>')
    .slice(0, 160)

jest.retryTimes(0)
jest.setTimeout(300_000)

const describeStress = process.env.GIT_STRESS ? describe : describe.skip

describeStress('git under concurrent writes', () => {
  let gitModule: typeof import('src/git')
  let root: Git
  let rootStack: OtomiStack

  beforeAll(async () => {
    rmSync(base, { recursive: true, force: true })
    mkdirSync(base, { recursive: true })
    await simpleGit().raw(['init', '--bare', '-b', branch, remotePath])
    const seedPath = join(base, 'seed')
    await simpleGit().clone(remotePath, seedPath)
    const seed = simpleGit(seedPath)
    await seed.addConfig('user.name', 'seed').addConfig('user.email', 'seed@test')
    mkdirSync(join(seedPath, 'env/settings'), { recursive: true })
    require('fs').writeFileSync(join(seedPath, 'env/settings/cluster.yaml'), 'name: test\n')
    await seed.checkoutLocalBranch(branch)
    await seed.add('.').commit('seed').push('origin', branch)

    gitModule = await import('src/git')
    root = await gitModule.default(rootPath, {
      repoUrl: `file://${remotePath}`,
      branch,
      username: 'otomi-admin',
      email: 'api@test',
      password: '',
    } as any)
    const { default: Stack } = await import('src/otomi-stack')
    rootStack = new Stack()
    rootStack.git = root
    // FileStore loading is not under test
    jest.spyOn(rootStack, 'loadValues').mockResolvedValue(undefined)
  })

  afterAll(() => rmSync(base, { recursive: true, force: true }))

  it('handles concurrent requests without git errors or lost commits', async () => {
    const userVisible: Failure[] = [] // thrown out of the request
    const logged: Failure[] = [] // swallowed, only debug-logged
    const expectedFiles: string[] = []
    let running = true

    const requestSync = (where: string) =>
      rootStack.requestSync().catch((e) => {
        logged.push({ where, message: firstLine(e) })
      })

    // One API write request, as doDeployment does it. Every round edits the same file per team again,
    // so a session that starts from a stale commit would conflict on the rebase.
    const request = async (round: number, team: string) => {
      const id = `r${round}-${team}`
      let session: Git | undefined
      try {
        session = await gitModule.getWorktreeRepo(root, join(base, 'sessions', id), branch)
        const file = `env/teams/${team}/netpols/np.yaml`
        await session.writeFile(file, { kind: 'AplTeamNetworkControl', metadata: { name: team }, spec: { round } })
        await session.save('editor@test')
        expectedFiles.push(file)
      } catch (e) {
        userVisible.push({ where: session ? 'save/publish' : 'worktree add', message: firstLine(e) })
      } finally {
        if (session) await root.removeWorktree(session.path).catch(() => undefined)
      }
    }

    // checkAgainstGit, compressed to a short interval
    const periodicSync = async () => {
      while (running) {
        await requestSync('periodic sync')
        await new Promise((r) => setTimeout(r, 100))
      }
    }

    // Another writer on the same branch (other pod, operator, user)
    const externalWriter = async () => {
      const path = join(base, 'external')
      await simpleGit().clone(remotePath, path, ['-b', branch])
      const ext = simpleGit(path)
      await ext.addConfig('user.name', 'ext').addConfig('user.email', 'ext@test')
      let n = 0
      while (running) {
        n++
        require('fs').mkdirSync(join(path, 'env/external'), { recursive: true })
        require('fs').writeFileSync(join(path, `env/external/${n}.yaml`), `n: ${n}\n`)
        await ext.add('.').commit(`external ${n}`)
        for (let i = 0; i < 20; i++) {
          try {
            await ext.pull('origin', branch, { '--rebase': 'true' })
            await ext.push('origin', branch)
            expectedFiles.push(`env/external/${n}.yaml`)
            break
          } catch {
            await new Promise((r) => setTimeout(r, 20))
          }
        }
        await new Promise((r) => setTimeout(r, 50))
      }
    }

    const background = [periodicSync(), externalWriter()]
    for (let round = 0; round < ROUNDS; round++) {
      await Promise.all(Array.from({ length: PARALLEL }, (_, i) => request(round, `t${i}`)))
    }
    running = false
    await Promise.all(background)

    const remoteFiles = (await simpleGit(remotePath).raw(['ls-tree', '-r', '--name-only', branch])).split('\n')
    const lost = expectedFiles.filter((f) => !remoteFiles.includes(f))

    await rootStack.requestSync()
    const remoteHead = (await simpleGit(remotePath).revparse(branch)).trim()
    const rootHead = (await root.git.revparse('HEAD')).trim()

    const summary = (failures: Failure[]) => countBy(failures, (f) => `${f.where}: ${f.message}`)
    console.log(
      JSON.stringify(
        {
          requests: PARALLEL * ROUNDS,
          userVisible: summary(userVisible),
          logged: summary(logged),
          lostCommits: lost,
          rootInSync: rootHead === remoteHead,
        },
        null,
        2,
      ),
    )

    expect(userVisible).toEqual([])
    expect(logged).toEqual([])
    expect(lost).toEqual([])
    expect(rootHead).toBe(remoteHead)
  })
})
