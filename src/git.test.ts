import simpleGit from 'simple-git'
import { Git } from './git'

jest.mock('simple-git')

const mockRaw = jest.fn()
const mockPush = jest.fn()
const mockRemote = jest.fn()
const mockGitInstance = {
  env: jest.fn().mockReturnThis(),
  raw: mockRaw,
  push: mockPush,
  remote: mockRemote,
}
;(simpleGit as jest.Mock).mockReturnValue(mockGitInstance)

function makeRepo(): Git {
  return new Git('/tmp/test', 'https://origin.example.com/repo.git', 'user', 'user@example.com', undefined, 'main')
}

describe('Git.testRemoteConnection', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns false when remote is empty (no refs)', async () => {
    mockRaw.mockResolvedValue('')
    const repo = makeRepo()
    const result = await repo.testRemoteConnection('https://example.com/repo.git', 'mypass', 'myuser')
    expect(result).toBe(false)
    expect(mockRaw).toHaveBeenCalledWith(['ls-remote', expect.stringContaining('myuser')])
  })

  it('returns true when remote has existing refs', async () => {
    mockRaw.mockResolvedValue('abc123\trefs/heads/main\n')
    const repo = makeRepo()
    const result = await repo.testRemoteConnection('https://example.com/repo.git', 'mypass', 'myuser')
    expect(result).toBe(true)
  })

  it('calls ls-remote with PAT only (no username) in url', async () => {
    mockRaw.mockResolvedValue('abc123\trefs/heads/main\n')
    const repo = makeRepo()
    const result = await repo.testRemoteConnection('https://example.com/repo.git', 'mytoken')
    expect(result).toBe(true)
    expect(mockRaw).toHaveBeenCalledWith(['ls-remote', 'https://mytoken@example.com/repo.git'])
  })

  it('throws when ls-remote fails (unreachable remote)', async () => {
    mockRaw.mockRejectedValue(new Error('exit code 128'))
    const repo = makeRepo()
    await expect(repo.testRemoteConnection('https://bad.example.com/repo.git', 'p', 'u')).rejects.toThrow()
  })
})

describe('Git.pushToNewRemote', () => {
  beforeEach(() => jest.clearAllMocks())

  it('adds migration-remote, pushes, then removes in finally', async () => {
    mockRemote.mockResolvedValue('')
    mockPush.mockResolvedValue({})
    const repo = makeRepo()
    await repo.pushToNewRemote('https://example.com/repo.git', 'main', 'p', 'u')

    expect(mockRemote).toHaveBeenCalledWith(
      expect.arrayContaining(['add', 'migration-remote', expect.stringContaining('u')]),
    )
    expect(mockPush).toHaveBeenCalledWith('migration-remote', 'main')
    expect(mockRemote).toHaveBeenCalledWith(['remove', 'migration-remote'])
  })

  it('uses PAT only (no username) in migration-remote url', async () => {
    mockRemote.mockResolvedValue('')
    mockPush.mockResolvedValue({})
    const repo = makeRepo()
    await repo.pushToNewRemote('https://example.com/repo.git', 'main', 'mytoken')

    expect(mockRemote).toHaveBeenCalledWith(
      expect.arrayContaining(['add', 'migration-remote', 'https://mytoken@example.com/repo.git']),
    )
  })

  it('removes migration-remote in finally even when push fails', async () => {
    mockRemote.mockResolvedValue('')
    mockPush.mockRejectedValue(new Error('push failed'))
    const repo = makeRepo()
    await expect(repo.pushToNewRemote('https://example.com/repo.git', 'main', 'p', 'u')).rejects.toThrow('push failed')
    expect(mockRemote).toHaveBeenCalledWith(['remove', 'migration-remote'])
  })
})
