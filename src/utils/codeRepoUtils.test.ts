import axios from 'axios'
import { pathExists, unlink } from 'fs-extra'
import { chmod, writeFile } from 'fs/promises'
import simpleGit, { SimpleGit } from 'simple-git'
import { OtomiError } from 'src/error'
import { v4 as uuidv4 } from 'uuid'
import * as codeRepoUtils from './codeRepoUtils'
import {
  extractRepositoryRefs,
  getGiteaRepoUrls,
  getPrivateRepoBranches,
  getPublicRepoBranches,
  normalizeRepoUrl,
  normalizeSSHKey,
  setupGitAuthentication,
  testPrivateRepoConnect,
  testPublicRepoConnect,
} from './codeRepoUtils'

jest.mock('simple-git', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    env: jest.fn(),
    listRemote: jest.fn(),
  })),
}))

jest.mock('axios')
jest.mock('fs-extra')
jest.mock('fs/promises')
jest.mock('uuid')
jest.mock('src/error', () => ({
  OtomiError: jest.fn().mockImplementation((message) => {
    const error = new Error(message) as OtomiError
    error.code = 500
    error.publicMessage = message
    return error
  }),
}))

describe('codeRepoUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('testPrivateRepoConnect', () => {
    it('should connect to private repo with SSH key', async () => {
      const mockGit: Partial<SimpleGit> = {
        env: jest.fn(),
        listRemote: jest.fn().mockResolvedValueOnce('success'),
      }
      ;(simpleGit as jest.Mock).mockReturnValue(mockGit)
      ;(uuidv4 as jest.Mock).mockReturnValue('test-uuid')
      ;(pathExists as jest.Mock).mockResolvedValueOnce(true)

      const sshKey = '-----BEGIN OPENSSH PRIVATE KEY-----\nkey\n-----END OPENSSH PRIVATE KEY-----'

      const result = await testPrivateRepoConnect('git@github.com:user/repo.git', sshKey)

      expect(writeFile).toHaveBeenCalledWith('/tmp/otomi/sshKey-test-uuid', `${sshKey}\n`, { mode: 0o600 })
      expect(chmod).toHaveBeenCalledWith('/tmp/otomi/sshKey-test-uuid', 0o600)
      expect(mockGit.env).toHaveBeenCalledWith(
        'GIT_SSH_COMMAND',
        'ssh -i /tmp/otomi/sshKey-test-uuid -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null',
      )
      expect(mockGit.listRemote).toHaveBeenCalledWith(['git@github.com:user/repo.git'])
      expect(result).toEqual({ status: 'success' })
      expect(unlink).toHaveBeenCalledWith('/tmp/otomi/sshKey-test-uuid')
    })

    it('should connect to private repo with HTTPS authentication', async () => {
      const mockGit: Partial<SimpleGit> = {
        listRemote: jest.fn().mockResolvedValueOnce('success'),
      }
      ;(simpleGit as jest.Mock).mockReturnValue(mockGit)

      const result = await testPrivateRepoConnect('https://github.com/user/repo.git', undefined, 'username', 'token')

      expect(mockGit.listRemote).toHaveBeenCalledWith(['https://username:token@github.com/user/repo.git'])
      expect(result).toEqual({ status: 'success' })
    })

    it('should fail to connect with invalid URL', async () => {
      const result = await testPrivateRepoConnect('invalid-url')
      expect(result).toEqual({ status: 'failed' })
    })
  })

  describe('testPublicRepoConnect', () => {
    it('should connect to public repo', async () => {
      const mockGit: Partial<SimpleGit> = {
        listRemote: jest.fn().mockResolvedValueOnce('success'),
      }
      ;(simpleGit as jest.Mock).mockReturnValue(mockGit)

      const result = await testPublicRepoConnect('https://github.com/user/repo.git')

      expect(mockGit.listRemote).toHaveBeenCalledWith(['https://github.com/user/repo.git'])
      expect(result).toEqual({ status: 'success' })
    })

    it('should fail to connect to invalid public repo', async () => {
      const mockGit: Partial<SimpleGit> = {
        listRemote: jest.fn().mockRejectedValueOnce(new Error('failed')),
      }
      ;(simpleGit as jest.Mock).mockReturnValue(mockGit)

      const result = await testPublicRepoConnect('https://github.com/user/repo.git')

      expect(mockGit.listRemote).toHaveBeenCalledWith(['https://github.com/user/repo.git'])
      expect(result).toEqual({ status: 'failed' })
    })
  })

  describe('normalizeRepoUrl', () => {
    it('should normalize SSH URL', () => {
      const result = normalizeRepoUrl('git@github.com:user/repo.git', true, true)
      expect(result).toEqual('git@github.com:user/repo.git')
    })

    it('should normalize HTTPS URL', () => {
      const result = normalizeRepoUrl('https://github.com/user/repo', false, false)
      expect(result).toEqual('https://github.com/user/repo.git')
    })

    it('should return null for invalid URL', () => {
      const result = normalizeRepoUrl('invalid-url', false, false)
      expect(result).toBeNull()
    })
  })

  describe('getGiteaRepoUrls', () => {
    it('should return repo URLs', async () => {
      const mockResponse = {
        data: [{ full_name: 'org/repo1' }, { full_name: 'org/repo2' }],
      }
      ;(jest.spyOn(axios, 'create') as jest.Mock).mockReturnValue({
        get: jest.fn().mockResolvedValueOnce(mockResponse),
      })

      const result = await getGiteaRepoUrls('admin', 'password', 'org', 'domain.com')

      expect(result).toEqual(['https://gitea.domain.com/org/repo1.git', 'https://gitea.domain.com/org/repo2.git'])
    })

    it('should throw error on failure', async () => {
      ;(jest.spyOn(axios, 'create') as jest.Mock).mockReturnValue({
        get: jest.fn().mockRejectedValueOnce(new Error('failed')),
      })

      await expect(getGiteaRepoUrls('admin', 'password', 'org', 'domain.com')).rejects.toThrow(
        'Error getting internal repository names',
      )
    })
  })

  describe('extractRepositoryRefs', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should extract branches and tags correctly', async () => {
      const mockGit: Partial<SimpleGit> = {
        listRemote: jest.fn().mockResolvedValueOnce(`
          abcd1234	refs/heads/main
          efgh5678	refs/heads/develop
          ijkl9012	refs/tags/v1.0.0
          mnop3456	refs/tags/v1.1.0
        `),
      }
      ;(simpleGit as jest.Mock).mockReturnValue(mockGit)

      const result = await extractRepositoryRefs('https://github.com/user/repo.git')

      expect(result).toEqual(['main', 'develop', 'v1.0.0', 'v1.1.0'])
      expect(mockGit.listRemote).toHaveBeenCalledWith(['--refs', 'https://github.com/user/repo.git'])
    })

    it('should handle empty repository with no refs', async () => {
      const mockGit: Partial<SimpleGit> = {
        listRemote: jest.fn().mockResolvedValueOnce(''),
      }
      ;(simpleGit as jest.Mock).mockReturnValue(mockGit)

      const result = await extractRepositoryRefs('https://github.com/user/repo.git')

      expect(result).toEqual([])
    })

    it('should handle malformed ref lines', async () => {
      const mockGit: Partial<SimpleGit> = {
        listRemote: jest.fn().mockResolvedValueOnce(`
          abcd1234	refs/heads/main
          invalid-line
          efgh5678	refs/tags/v1.0.0
        `),
      }
      ;(simpleGit as jest.Mock).mockReturnValue(mockGit)

      const result = await extractRepositoryRefs('https://github.com/user/repo.git')

      expect(result).toEqual(['main', 'v1.0.0'])
    })

    it('should return empty array on listRemote error', async () => {
      const mockGit: Partial<SimpleGit> = {
        listRemote: jest.fn().mockRejectedValueOnce(new Error('Network error')),
      }
      ;(simpleGit as jest.Mock).mockReturnValue(mockGit)

      const result = await extractRepositoryRefs('https://github.com/user/repo.git')

      expect(result).toEqual([])
    })
  })

  describe('normalizeSSHKey', () => {
    it('should normalize SSH key with multiple whitespaces', () => {
      const sshKey = `-----BEGIN OPENSSH PRIVATE KEY-----
      some    key   with   multiple    whitespaces
      -----END OPENSSH PRIVATE KEY-----`

      const result = normalizeSSHKey(sshKey)

      expect(result).toEqual(`-----BEGIN OPENSSH PRIVATE KEY-----
some
key
with
multiple
whitespaces
-----END OPENSSH PRIVATE KEY-----`)
    })

    it('should throw error for invalid SSH key format', () => {
      const invalidKey = 'just a random string'

      expect(() => normalizeSSHKey(invalidKey)).toThrow('Invalid SSH Key format')
    })
  })

  describe('setupGitAuthentication', () => {
    it('should setup SSH authentication with private key', async () => {
      const sshKey = '-----BEGIN OPENSSH PRIVATE KEY-----\nkey\n-----END OPENSSH PRIVATE KEY-----'
      const repoUrl = 'git@github.com:user/repo.git'

      const mockGit: Partial<SimpleGit> = {
        env: jest.fn(),
      }
      ;(simpleGit as jest.Mock).mockReturnValue(mockGit)
      ;(uuidv4 as jest.Mock).mockReturnValue('test-uuid')
      ;(writeFile as jest.Mock).mockResolvedValue(undefined)
      ;(chmod as jest.Mock).mockResolvedValue(undefined)

      const result = await setupGitAuthentication(repoUrl, sshKey)

      expect(mockGit.env).toHaveBeenCalledWith(
        'GIT_SSH_COMMAND',
        'ssh -i /tmp/otomi/sshKey-test-uuid -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null',
      )
      expect(result.url).toBe(repoUrl)
      expect(result.keyPath).toBe('/tmp/otomi/sshKey-test-uuid')
    })

    it('should setup HTTPS authentication with username and token', async () => {
      const repoUrl = 'https://github.com/user/repo.git'
      const username = 'testuser'
      const accessToken = 'test-token'

      const result = await setupGitAuthentication(repoUrl, undefined, username, accessToken)

      expect(result.url).toBe(
        `https://${encodeURIComponent(username)}:${encodeURIComponent(accessToken)}@github.com/user/repo.git`,
      )
    })

    it('should throw error for missing HTTPS credentials', async () => {
      const repoUrl = 'https://github.com/user/repo.git'

      await expect(setupGitAuthentication(repoUrl)).rejects.toThrow(
        'Username and access token are required for HTTPS authentication',
      )
    })

    it('should throw error for invalid repository URL', async () => {
      const repoUrl = 'invalid-url'

      await expect(setupGitAuthentication(repoUrl)).rejects.toThrow('Invalid repository URL format')
    })
  })

  describe('getPrivateRepoBranches', () => {
    it('should get branches from private repo using SSH', async () => {
      const repoUrl = 'git@github.com:user/repo.git'
      const sshKey = '-----BEGIN OPENSSH PRIVATE KEY-----\nkey\n-----END OPENSSH PRIVATE KEY-----'

      const mockRefs = ['main', 'develop', 'feature/test']
      const mockGit: Partial<SimpleGit> = {
        listRemote: jest.fn().mockResolvedValueOnce(`
          abcd1234\trefs/heads/main
          efgh5678\trefs/heads/develop
          ijkl9012\trefs/heads/feature/test
        `),
      }

      ;(simpleGit as jest.Mock).mockReturnValue(mockGit)
      ;(uuidv4 as jest.Mock).mockReturnValue('test-uuid')
      ;(pathExists as jest.Mock).mockResolvedValue(true)

      const mockSetupGitAuthentication = {
        url: repoUrl,
        sshKey,
        git: mockGit as SimpleGit,
        keyPath: '/mock/path/test-uuid',
      }
      jest.spyOn(codeRepoUtils, 'setupGitAuthentication').mockResolvedValueOnce(mockSetupGitAuthentication)
      const result = await getPrivateRepoBranches(repoUrl)

      expect(result).toEqual(mockRefs)
    })

    it('should return empty array for failed private repo connection', async () => {
      const repoUrl = 'git@github.com:user/repo.git'
      const sshKey = '-----BEGIN OPENSSH PRIVATE KEY-----\nkey\n-----END OPENSSH PRIVATE KEY-----'

      ;(simpleGit as jest.Mock).mockImplementation(() => ({
        listRemote: jest.fn().mockRejectedValue(new Error('Connection failed')),
      }))

      const result = await getPrivateRepoBranches(repoUrl, sshKey)

      expect(result).toEqual([])
    })
  })

  describe('getPublicRepoBranches', () => {
    it('should retrieve branches from a public repository', async () => {
      const repoUrl = 'https://github.com/user/repo.git'

      const mockGit: Partial<SimpleGit> = {
        listRemote: jest.fn().mockResolvedValueOnce(`
          abcd1234	refs/heads/main
          efgh5678	refs/heads/develop
          ijkl9012	refs/tags/v1.0.0
        `),
      }
      ;(simpleGit as jest.Mock).mockReturnValue(mockGit)

      const result = await getPublicRepoBranches(repoUrl)

      expect(result).toEqual(['main', 'develop', 'v1.0.0'])
      expect(mockGit.listRemote).toHaveBeenCalledWith(['--refs', repoUrl])
    })

    it('should return empty array when retrieving refs fails', async () => {
      const repoUrl = 'https://github.com/user/repo.git'

      const mockGit: Partial<SimpleGit> = {
        listRemote: jest.fn().mockRejectedValueOnce(new Error('Network error')),
      }
      ;(simpleGit as jest.Mock).mockReturnValue(mockGit)

      const result = await getPublicRepoBranches(repoUrl)

      expect(result).toEqual([])
    })

    it('should handle an empty repository with no refs', async () => {
      const repoUrl = 'https://github.com/user/repo.git'

      const mockGit: Partial<SimpleGit> = {
        listRemote: jest.fn().mockResolvedValueOnce(''),
      }
      ;(simpleGit as jest.Mock).mockReturnValue(mockGit)

      const result = await getPublicRepoBranches(repoUrl)

      expect(result).toEqual([])
    })
  })
})
