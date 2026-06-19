import simpleGit from 'simple-git'
import { Git } from './git'

jest.mock('simple-git')

const mockRaw = jest.fn()
const mockPush = jest.fn()
const mockRemote = jest.fn()
const mockFetch = jest.fn()
const mockGitInstance = {
  env: jest.fn().mockReturnThis(),
  raw: mockRaw,
  push: mockPush,
  remote: mockRemote,
  fetch: mockFetch,
}
;(simpleGit as jest.Mock).mockReturnValue(mockGitInstance)

function makeRepo(): Git {
  return new Git('/tmp/test', 'https://origin.example.com/repo.git', 'user', 'user@example.com', '', 'main')
}

describe('Git.testRemoteConnection', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns false when remote is empty (no refs)', async () => {
    mockRaw.mockResolvedValue('')
    const repo = makeRepo()
    const gitConfig = {
      repoUrl: 'https://example.com/repo.git',
      password: 'mypass',
      branch: 'main',
      username: 'myuser',
      email: '',
    }
    const result = await repo.testRemoteConnection(gitConfig)
    expect(result).toBe(false)
    expect(mockRaw).toHaveBeenCalledWith(['ls-remote', expect.stringContaining('myuser'), 'refs/heads/main'])
  })

  it('returns true when remote has existing refs', async () => {
    mockRaw.mockResolvedValue('abc123\trefs/heads/main\n')
    const repo = makeRepo()
    const gitConfig = {
      repoUrl: 'https://example.com/repo.git',
      password: 'mypass',
      branch: 'main',
      username: 'myuser',
      email: '',
    }
    const result = await repo.testRemoteConnection(gitConfig)
    expect(result).toBe(true)
  })

  it('calls ls-remote with PAT only (no username) in url', async () => {
    mockRaw.mockResolvedValue('abc123\trefs/heads/main\n')
    const repo = makeRepo()
    const gitConfig = {
      repoUrl: 'https://example.com/repo.git',
      password: 'mytoken',
      branch: 'main',
      email: '',
    }
    const result = await repo.testRemoteConnection(gitConfig)
    expect(result).toBe(true)
    expect(mockRaw).toHaveBeenCalledWith(['ls-remote', 'https://mytoken@example.com/repo.git', 'refs/heads/main'])
  })

  it('returns false when branch does not exist but remote has other refs', async () => {
    mockRaw.mockResolvedValue('')
    const repo = makeRepo()
    const gitConfig = {
      repoUrl: 'https://example.com/repo.git',
      password: 'mytoken',
      username: 'myuser',
      branch: 'feature-branch',
      email: '',
    }
    const result = await repo.testRemoteConnection(gitConfig)
    expect(result).toBe(false)
    expect(mockRaw).toHaveBeenCalledWith(['ls-remote', expect.stringContaining('myuser'), 'refs/heads/feature-branch'])
  })

  it('throws when ls-remote fails (unreachable remote)', async () => {
    mockRaw.mockRejectedValue(new Error('exit code 128'))
    const repo = makeRepo()
    const gitConfig = {
      repoUrl: 'https://bad.example.com/repo.git',
      password: 'p',
      username: 'u',
      branch: 'main',
      email: '',
    }
    await expect(repo.testRemoteConnection(gitConfig)).rejects.toThrow()
  })
})

describe('Git.pushToNewRemote', () => {
  beforeEach(() => jest.clearAllMocks())

  it('unshallows, adds migration-remote, pushes, then removes in finally', async () => {
    mockFetch.mockResolvedValue({})
    mockRemote.mockResolvedValue('')
    mockPush.mockResolvedValue({})
    const repo = makeRepo()
    const gitConfig = {
      repoUrl: 'https://example.com/repo.git',
      branch: 'main',
      password: 'p',
      username: 'u',
      email: '',
    }
    await repo.pushToNewRemote(gitConfig)

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
    const gitConfig = {
      repoUrl: 'https://example.com/repo.git',
      branch: 'main',
      password: 'p',
      username: 'u',
      email: '',
    }
    await repo.pushToNewRemote(gitConfig)

    expect(mockPush).toHaveBeenCalledWith('migration-remote', 'HEAD:refs/heads/main')
  })

  it('uses PAT only (no username) in migration-remote url', async () => {
    mockFetch.mockResolvedValue({})
    mockRemote.mockResolvedValue('')
    mockPush.mockResolvedValue({})
    const repo = makeRepo()
    const gitConfig = {
      repoUrl: 'https://example.com/repo.git',
      branch: 'main',
      password: 'mytoken',
      email: '',
    }
    await repo.pushToNewRemote(gitConfig)

    expect(mockRemote).toHaveBeenCalledWith(
      expect.arrayContaining(['add', 'migration-remote', 'https://mytoken@example.com/repo.git']),
    )
  })

  it('pushes local branch to target branch using refspec when branch names differ', async () => {
    mockFetch.mockResolvedValue({})
    mockRemote.mockResolvedValue('')
    mockPush.mockResolvedValue({})
    const repo = makeRepo() // local branch is 'main'
    const gitConfig = {
      repoUrl: 'https://example.com/repo.git',
      branch: 'feature-branch',
      username: 'u',
      password: 'p',
      email: '',
    }
    await repo.pushToNewRemote(gitConfig)

    expect(mockPush).toHaveBeenCalledWith('migration-remote', 'HEAD:refs/heads/feature-branch')
  })

  it('removes migration-remote in finally even when push fails', async () => {
    mockFetch.mockResolvedValue({})
    mockRemote.mockResolvedValue('')
    mockPush.mockRejectedValue(new Error('push failed'))
    const repo = makeRepo()
    const gitConfig = {
      repoUrl: 'https://example.com/repo.git',
      branch: 'main',
      username: 'u',
      password: 'p',
      email: '',
    }
    await expect(repo.pushToNewRemote(gitConfig)).rejects.toThrow('push failed')
    expect(mockRemote).toHaveBeenCalledWith(['remove', 'migration-remote'])
  })
})
