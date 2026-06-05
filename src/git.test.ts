import simpleGit from 'simple-git'
import { Git, getWorktreeRepo, default as getRepo } from './git'

jest.mock('simple-git')

const mockRaw = jest.fn()
const mockPush = jest.fn()
const mockRemote = jest.fn()
const mockFetch = jest.fn()
const mockAddConfig = jest.fn()
const mockEnv = jest.fn().mockReturnThis()
const mockGitInstance = {
  env: mockEnv,
  raw: mockRaw,
  push: mockPush,
  remote: mockRemote,
  fetch: mockFetch,
  addConfig: mockAddConfig,
}
;(simpleGit as jest.Mock).mockReturnValue(mockGitInstance)

function makeRepo(): Git {
  return new Git('/tmp/test', 'https://origin.example.com/repo.git', 'user', 'user@example.com', undefined, 'main')
}

describe('Git SSH authentication', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sets GIT_SSH_COMMAND on the SimpleGit instance when constructed with an SSH URL and key path', () => {
    new Git('/tmp/test', 'git@github.com:org/repo.git', 'user', 'user@example.com', undefined, 'main', '/mnt/keys/id_rsa')

    expect(mockEnv).toHaveBeenCalledWith(
      'GIT_SSH_COMMAND',
      'ssh -i /mnt/keys/id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null',
    )
  })

  it('does not set GIT_SSH_COMMAND when constructed with an HTTPS URL', () => {
    new Git('/tmp/test', 'https://github.com/org/repo.git', 'user', 'user@example.com', undefined, 'main')

    expect(mockEnv).not.toHaveBeenCalledWith('GIT_SSH_COMMAND', expect.anything())
  })
})

describe('getWorktreeRepo', () => {
  beforeEach(() => jest.clearAllMocks())

  it('propagates GIT_SSH_COMMAND to the worktree when main repo uses SSH', async () => {
    const mainRepo = new Git(
      '/tmp/main',
      'git@github.com:org/repo.git',
      'user',
      'user@example.com',
      undefined,
      'main',
      '/mnt/keys/id_rsa',
    )
    jest.spyOn(mainRepo, 'createWorktree').mockResolvedValue()
    mockAddConfig.mockResolvedValue(undefined)
    mockEnv.mockClear()

    await getWorktreeRepo(mainRepo, '/tmp/worktrees/session-1')

    expect(mockEnv).toHaveBeenCalledWith(
      'GIT_SSH_COMMAND',
      'ssh -i /mnt/keys/id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null',
    )
  })
})

describe('getRepo', () => {
  it('throws a descriptive error when given an SSH URL without GIT_SSH_KEY_PATH', async () => {
    await expect(
      getRepo('/tmp/test', 'git@github.com:org/repo.git', 'user', 'user@example.com', '', 'main'),
    ).rejects.toThrow('GIT_SSH_KEY_PATH')
  })
})

describe('Git.testRemoteConnection', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns false when remote is empty (no refs)', async () => {
    mockRaw.mockResolvedValue('')
    const repo = makeRepo()
    const result = await repo.testRemoteConnection('https://example.com/repo.git', 'mypass', 'main', 'myuser')
    expect(result).toBe(false)
    expect(mockRaw).toHaveBeenCalledWith(['ls-remote', expect.stringContaining('myuser'), 'refs/heads/main'])
  })

  it('returns true when remote has existing refs', async () => {
    mockRaw.mockResolvedValue('abc123\trefs/heads/main\n')
    const repo = makeRepo()
    const result = await repo.testRemoteConnection('https://example.com/repo.git', 'mypass', 'main', 'myuser')
    expect(result).toBe(true)
  })

  it('calls ls-remote with PAT only (no username) in url', async () => {
    mockRaw.mockResolvedValue('abc123\trefs/heads/main\n')
    const repo = makeRepo()
    const result = await repo.testRemoteConnection('https://example.com/repo.git', 'mytoken', 'main')
    expect(result).toBe(true)
    expect(mockRaw).toHaveBeenCalledWith(['ls-remote', 'https://mytoken@example.com/repo.git', 'refs/heads/main'])
  })

  it('returns false when branch does not exist but remote has other refs', async () => {
    mockRaw.mockResolvedValue('')
    const repo = makeRepo()
    const result = await repo.testRemoteConnection('https://example.com/repo.git', 'mypass', 'feature-branch', 'myuser')
    expect(result).toBe(false)
    expect(mockRaw).toHaveBeenCalledWith(['ls-remote', expect.stringContaining('myuser'), 'refs/heads/feature-branch'])
  })

  it('throws when ls-remote fails (unreachable remote)', async () => {
    mockRaw.mockRejectedValue(new Error('exit code 128'))
    const repo = makeRepo()
    await expect(repo.testRemoteConnection('https://bad.example.com/repo.git', 'p', 'main', 'u')).rejects.toThrow()
  })
})

describe('Git.pushToNewRemote', () => {
  beforeEach(() => jest.clearAllMocks())

  it('unshallows, adds migration-remote, pushes, then removes in finally', async () => {
    mockFetch.mockResolvedValue({})
    mockRemote.mockResolvedValue('')
    mockPush.mockResolvedValue({})
    const repo = makeRepo()
    await repo.pushToNewRemote('https://example.com/repo.git', 'main', 'p', 'u')

    expect(mockFetch).toHaveBeenCalledWith(['origin', '--unshallow'])
    expect(mockRemote).toHaveBeenCalledWith(
      expect.arrayContaining(['add', 'migration-remote', expect.stringContaining('u')]),
    )
    expect(mockPush).toHaveBeenCalledWith('migration-remote', 'HEAD:refs/heads/main')
    expect(mockRemote).toHaveBeenCalledWith(['remove', 'migration-remote'])
  })

  it('continues when unshallow fails (repo already complete)', async () => {
    mockFetch.mockRejectedValue(new Error('--unshallow on a complete repository does not make sense'))
    mockRemote.mockResolvedValue('')
    mockPush.mockResolvedValue({})
    const repo = makeRepo()
    await repo.pushToNewRemote('https://example.com/repo.git', 'main', 'p', 'u')

    expect(mockPush).toHaveBeenCalledWith('migration-remote', 'HEAD:refs/heads/main')
  })

  it('uses PAT only (no username) in migration-remote url', async () => {
    mockFetch.mockResolvedValue({})
    mockRemote.mockResolvedValue('')
    mockPush.mockResolvedValue({})
    const repo = makeRepo()
    await repo.pushToNewRemote('https://example.com/repo.git', 'main', 'mytoken')

    expect(mockRemote).toHaveBeenCalledWith(
      expect.arrayContaining(['add', 'migration-remote', 'https://mytoken@example.com/repo.git']),
    )
  })

  it('pushes local branch to target branch using refspec when branch names differ', async () => {
    mockFetch.mockResolvedValue({})
    mockRemote.mockResolvedValue('')
    mockPush.mockResolvedValue({})
    const repo = makeRepo() // local branch is 'main'
    await repo.pushToNewRemote('https://example.com/repo.git', 'feature-branch', 'p', 'u')

    expect(mockPush).toHaveBeenCalledWith('migration-remote', 'HEAD:refs/heads/feature-branch')
  })

  it('removes migration-remote in finally even when push fails', async () => {
    mockFetch.mockResolvedValue({})
    mockRemote.mockResolvedValue('')
    mockPush.mockRejectedValue(new Error('push failed'))
    const repo = makeRepo()
    await expect(repo.pushToNewRemote('https://example.com/repo.git', 'main', 'p', 'u')).rejects.toThrow('push failed')
    expect(mockRemote).toHaveBeenCalledWith(['remove', 'migration-remote'])
  })
})
