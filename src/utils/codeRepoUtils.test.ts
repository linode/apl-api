import axios from 'axios'
import { writeFile } from 'fs/promises'
import simpleGit, { SimpleGit } from 'simple-git'
import { OtomiError } from 'src/error'
import { v4 as uuidv4 } from 'uuid'
import { getSecretValues } from '../k8s-operations'
import {
  extractRepositoryRefs,
  getAuthenticatedGitClient,
  getGiteaRepoUrls,
  normalizeRepoUrl,
  normalizeSSHKey,
} from './codeRepoUtils'

jest.mock('simple-git', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    env: jest.fn(),
    listRemote: jest.fn(),
  })),
}))

jest.mock('axios')
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
jest.mock('../k8s-operations', () => ({
  getSecretValues: jest.fn(),
}))

describe('codeRepoUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('normalizeRepoUrl', () => {
    it('should normalize SSH URL', () => {
      const result = normalizeRepoUrl('git@github.com:user/repo.git', true, true)
      expect(result).toEqual('git@github.com:user/repo.git')
    })

    it('should normalize protocol-less HTTPS URL', () => {
      const result = normalizeRepoUrl('github.com/user/repo', false, false)
      expect(result).toEqual('https://github.com/user/repo.git')
    })

    it.each([
      'javascript:alert(1)',
      'data:text/html,<svg/onload=alert(1)>',
      'vbscript:msgbox(1)',
      'ftp://github.com/example/repo',
      'github.com/example',
      'github.com/example/repo<script>',
    ])('should reject unsafe repository URL: %s', (repoUrl) => {
      expect(normalizeRepoUrl(repoUrl, false, false)).toBeNull()
    })

    it.each([
      ['https://github.com/example/repo', 'https://github.com/example/repo.git'],
      ['github.com/example/repo', 'https://github.com/example/repo.git'],
      [
        'https://gitlab.example.com/platform/backend/my-repo',
        'https://gitlab.example.com/platform/backend/my-repo.git',
      ],
      ['gitlab.example.com/platform/backend/my-repo', 'https://gitlab.example.com/platform/backend/my-repo.git'],
    ])('should normalize valid repository URL: %s', (input, expected) => {
      expect(normalizeRepoUrl(input, false, false)).toEqual(expected)
    })

    it.each(['git@gitlab.example.com:platform/backend/my-repo.git', 'git@github.com:example/repo.git'])(
      'should preserve SSH format for private SSH repositories',
      (input) => {
        const result = normalizeRepoUrl(input, true, true)

        expect(result).toEqual(input)
      },
    )

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
    it('should extract branches and tags correctly', async () => {
      const mockGit: Partial<SimpleGit> = {
        listRemote: jest.fn().mockResolvedValueOnce(`
          abcd1234	refs/heads/main
          efgh5678	refs/heads/develop
          ijkl9012	refs/tags/v1.0.0
          mnop3456	refs/tags/v1.1.0
        `),
      }

      const result = await extractRepositoryRefs('https://github.com/user/repo.git', mockGit as SimpleGit)

      expect(result).toEqual(['main', 'develop', 'v1.0.0', 'v1.1.0'])
      expect(mockGit.listRemote).toHaveBeenCalledWith(['--refs', 'https://github.com/user/repo.git'])
    })

    it('should handle empty repository with no refs', async () => {
      const mockGit: Partial<SimpleGit> = {
        listRemote: jest.fn().mockResolvedValueOnce(''),
      }

      const result = await extractRepositoryRefs('https://github.com/user/repo.git', mockGit as SimpleGit)

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

      const result = await extractRepositoryRefs('https://github.com/user/repo.git', mockGit as SimpleGit)

      expect(result).toEqual(['main', 'v1.0.0'])
    })

    it('should propagate errors from listRemote', async () => {
      const mockGit: Partial<SimpleGit> = {
        listRemote: jest.fn().mockRejectedValueOnce(new Error('Network error')),
      }

      await expect(extractRepositoryRefs('https://github.com/user/repo.git', mockGit as SimpleGit)).rejects.toThrow(
        'Network error',
      )
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
    it('should setup SSH authentication with private key from secret', async () => {
      const sshKey = '-----BEGIN OPENSSH PRIVATE KEY-----\nkey\n-----END OPENSSH PRIVATE KEY-----'
      const repoUrl = 'git@github.com:user/repo.git'
      const teamId = 'team1'
      const secretName = 'my-ssh-secret'

      const mockGitInstance = { env: jest.fn(), listRemote: jest.fn() }
      mockGitInstance.env.mockReturnValue(mockGitInstance)
      ;(simpleGit as jest.Mock).mockReturnValue(mockGitInstance)
      ;(uuidv4 as jest.Mock).mockReturnValue('test-uuid')
      ;(writeFile as jest.Mock).mockResolvedValue(undefined)
      ;(getSecretValues as jest.Mock).mockResolvedValue({ 'ssh-privatekey': sshKey })

      const result = await getAuthenticatedGitClient(repoUrl, teamId, undefined, undefined, secretName)

      expect(mockGitInstance.env).toHaveBeenCalledWith(
        'GIT_SSH_COMMAND',
        'ssh -i /tmp/otomi/sshKey-test-uuid -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null',
      )
      expect(result.url).toBe(repoUrl)
      expect(result.keyPath).toBe('/tmp/otomi/sshKey-test-uuid')
    })

    it('should setup HTTPS authentication with credentials from secret', async () => {
      const repoUrl = 'https://github.com/user/repo.git'
      const teamId = 'team1'
      const secretName = 'my-https-secret'
      const username = 'testuser'
      const accessToken = 'test-token'

      const mockGitInstance = { env: jest.fn() }
      mockGitInstance.env.mockReturnValue(mockGitInstance)
      ;(simpleGit as jest.Mock).mockReturnValue(mockGitInstance)
      ;(getSecretValues as jest.Mock).mockResolvedValue({ username, password: accessToken })

      const result = await getAuthenticatedGitClient(repoUrl, teamId, undefined, undefined, secretName)

      expect(result.url).toBe(`https://${username}:${accessToken}@github.com/user/repo.git`)
    })

    it('should return unauthenticated URL when no secret provided for public HTTPS repo', async () => {
      const repoUrl = 'https://github.com/user/repo.git'
      const teamId = 'team1'

      const mockGitInstance = { env: jest.fn() }
      mockGitInstance.env.mockReturnValue(mockGitInstance)
      ;(simpleGit as jest.Mock).mockReturnValue(mockGitInstance)

      const result = await getAuthenticatedGitClient(repoUrl, teamId)

      expect(result.url).toBe('https://github.com/user/repo.git')
    })

    it('should throw error for SSH repo without secret', async () => {
      const repoUrl = 'git@github.com:user/repo.git'
      const teamId = 'team1'

      const mockGitInstance = { env: jest.fn() }
      mockGitInstance.env.mockReturnValue(mockGitInstance)
      ;(simpleGit as jest.Mock).mockReturnValue(mockGitInstance)

      await expect(getAuthenticatedGitClient(repoUrl, teamId)).rejects.toThrow('SSH requires a secret with private key')
    })

    it('should throw error for invalid repository URL', async () => {
      const repoUrl = 'invalid-url'
      const teamId = 'team1'

      const mockGitInstance = { env: jest.fn() }
      mockGitInstance.env.mockReturnValue(mockGitInstance)
      ;(simpleGit as jest.Mock).mockReturnValue(mockGitInstance)

      await expect(getAuthenticatedGitClient(repoUrl, teamId)).rejects.toThrow('Invalid repository URL format')
    })
  })
})
