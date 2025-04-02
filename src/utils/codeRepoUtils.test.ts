import axios from 'axios'
import { pathExists, unlink } from 'fs-extra'
import { chmod, writeFile } from 'fs/promises'
import simpleGit, { SimpleGit } from 'simple-git'
import { OtomiError } from 'src/error'
import { v4 as uuidv4 } from 'uuid'
import { getGiteaRepoUrls, normalizeRepoUrl, testPrivateRepoConnect, testPublicRepoConnect } from './codeRepoUtils'

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
})
