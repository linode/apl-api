jest.mock('@linode/api-v4', () => ({
  __esModule: true,
  baseRequest: {
    interceptors: {
      request: {
        clear: jest.fn(),
      },
    },
  },
  setToken: jest.fn(),
  createBucket: jest.fn(),
  createObjectStorageKeys: jest.fn(),
  getKubernetesCluster: jest.fn(),
}))

import { createBucket, createObjectStorageKeys, ObjectStorageKey, setToken } from '@linode/api-v4'
import { OtomiError } from 'src/error'
import { ObjWizard } from 'src/otomi-models'
import OtomiStack from 'src/otomi-stack'
import { defineClusterId, ObjectStorageClient } from './wizardUtils'

describe('ObjectStorageClient', () => {
  let client: ObjectStorageClient
  let clusterId: string | undefined = '12345'

  beforeEach(() => {
    client = new ObjectStorageClient('test-token')
  })

  describe('constructor', () => {
    it('should set token when initialized', () => {
      ;(setToken as jest.Mock).mockResolvedValue(undefined)
      expect(setToken).toHaveBeenCalledWith('test-token')
    })
  })

  describe('createObjectStorageBucket', () => {
    const label = 'test-bucket'
    const region = 'us-east'
    let otomiStack: OtomiStack
    const domainSuffix = 'dev.linode-apl.net'
    beforeEach(async () => {
      otomiStack = new OtomiStack()
      await otomiStack.init()
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })
    it('should successfully create bucket', async () => {
      const mockResponse = { label: 'test-bucket' }
      ;(createBucket as jest.Mock).mockResolvedValue(mockResponse)

      const result = await client.createObjectStorageBucket(label, region)

      expect(createBucket).toHaveBeenCalledWith({
        label,
        region,
      })
      expect(result).toBe('test-bucket')
    })

    it('should return OtomiError when bucket creation fails', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { errors: [{ reason: 'Your OAuth token is not authorized to use this endpoint' }] },
        },
      }
      ;(createBucket as jest.Mock).mockRejectedValue(mockError)

      const result = await client.createObjectStorageBucket(label, region)
      expect(result).toBeInstanceOf(OtomiError)
      // @ts-ignore
      expect(result.publicMessage).toBe('Your OAuth token is not authorized to use this endpoint')
      // @ts-ignore
      expect(result.code).toBe(401)
    })

    it('should return OtomiError with default message when no specific error info', async () => {
      const mockError = {
        response: {
          status: 500,
        },
      }
      ;(createBucket as jest.Mock).mockRejectedValue(mockError)

      const result = await client.createObjectStorageBucket(label, region)
      expect(result).toBeInstanceOf(OtomiError)
      // @ts-ignore
      expect(result.publicMessage).toBe('Error creating object storage bucket')
      // @ts-ignore
      expect(result.code).toBe(500)
    })

    test('should return lkeClusterId', () => {
      const settings = { cluster: { name: 'cluster-123' } }
      clusterId = defineClusterId(settings.cluster.name)

      expect(clusterId).toBe('cluster-123')
    })

    test('should return stripped down clusterId when name does not include prefix', () => {
      const settings = { cluster: { name: 'aplinstall123' } }
      clusterId = defineClusterId(settings.cluster.name)

      expect(clusterId).toBe('123')
    })

    test('should return 123 when clusterId is a number', () => {
      const settings = { cluster: { name: 123 } }
      clusterId = defineClusterId(settings.cluster.name)

      expect(clusterId).toBe('123')
    })

    test('should return undefined when cluster name is undefined', () => {
      const settings: any = { cluster: {} }
      clusterId = defineClusterId(settings.cluster?.name)

      expect(clusterId).toBe(undefined)
    })

    test('should return error when cluster name is undefined', async () => {
      const data = { apiToken: 'some-token', regionId: 'us-east', label: 'my-cluster' }
      jest.spyOn(otomiStack, 'getSettings').mockReturnValue({
        cluster: { domainSuffix, provider: 'linode' },
      } as any)
      const result: ObjWizard = await otomiStack.createObjWizard(data)

      expect(result.status).toBe('error')
      expect(result.errorMessage).toBe('Cluster name is not found.')
    })
  })

  describe('createObjectStorageKey', () => {
    const region = 'us-east'
    const bucketNames = ['bucket1', 'bucket2']

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2024-01-01T12:00:00.000Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should successfully create object storage keys', async () => {
      const mockResponse: Pick<ObjectStorageKey, 'access_key' | 'secret_key' | 'regions'> = {
        access_key: 'test-access-key',
        secret_key: 'test-secret-key',
        regions: [{ id: 'us-east', s3_endpoint: 'us-east-1.linodeobjects.com' }],
      }
      ;(createObjectStorageKeys as jest.Mock).mockResolvedValue(mockResponse)

      const result = await client.createObjectStorageKey(clusterId!, region, bucketNames)

      expect(createObjectStorageKeys).toHaveBeenCalledWith({
        label: `lke${clusterId}-key-1704110400000`,
        regions: [region],
        bucket_access: [
          { bucket_name: 'bucket1', permissions: 'read_write', region },
          { bucket_name: 'bucket2', permissions: 'read_write', region },
        ],
      })
      expect(result).toEqual(mockResponse)
    })

    it('should throw OtomiError when keys creation fails', async () => {
      const mockError = {
        response: {
          data: { errors: [{ reason: 'Your OAuth token is not authorized to use this endpoint' }] },
          status: 401,
        },
      }
      ;(createObjectStorageKeys as jest.Mock).mockRejectedValue(mockError)

      const result = await client.createObjectStorageKey(clusterId!, region, bucketNames)
      expect(result).toBeInstanceOf(OtomiError)
      // @ts-ignore
      expect(result.publicMessage).toBe('Your OAuth token is not authorized to use this endpoint')
      // @ts-ignore
      expect(result.code).toBe(401)
    })
  })
})
