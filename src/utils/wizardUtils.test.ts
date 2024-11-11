import { ObjectStorageKey } from '@linode/api-v4'
import { expect } from 'chai'
import proxyquire from 'proxyquire'
import sinon from 'sinon'
import { OtomiError } from 'src/error'

describe('ObjectStorageClient', () => {
  let ObjectStorageClient: any
  let setTokenStub: sinon.SinonStub
  let getKubernetesClusterStub: sinon.SinonStub
  let createObjectStorageKeysStub: sinon.SinonStub
  let createBucketStub: sinon.SinonStub
  let client: any
  const clusterId = 12345

  beforeEach(() => {
    setTokenStub = sinon.stub()
    getKubernetesClusterStub = sinon.stub()
    createObjectStorageKeysStub = sinon.stub()
    createBucketStub = sinon.stub()

    // Use proxyquire to mock the module imports
    const module = proxyquire('./wizardUtils.ts', {
      '@linode/api-v4': {
        setToken: setTokenStub,
        getKubernetesCluster: getKubernetesClusterStub,
        createObjectStorageKeys: createObjectStorageKeysStub,
        createBucket: createBucketStub,
      },
    })

    ObjectStorageClient = module.ObjectStorageClient
    client = new ObjectStorageClient('test-token')
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('constructor', () => {
    it('should set token when initialized', () => {
      expect(setTokenStub.calledOnceWith('test-token')).to.be.true
    })
  })

  describe('getClusterRegion', () => {
    it('should successfully return cluster region', async () => {
      const mockResponse = { region: 'us-east' }
      getKubernetesClusterStub.resolves(mockResponse)
      const region = await client.getClusterRegion(clusterId)

      expect(getKubernetesClusterStub.calledOnceWith(clusterId)).to.be.true
      expect(region).to.equal(mockResponse.region)
    })

    it('should throw OtomiError with API error reason', async () => {
      const mockError = {
        response: {
          data: { errors: [{ reason: 'Not found' }] },
          status: 404,
        },
      }
      getKubernetesClusterStub.rejects(mockError)

      try {
        await client.getClusterRegion(clusterId)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).to.be.instanceOf(OtomiError)
        expect(error.publicMessage).to.equal('Not found')
        expect(error.code).to.equal(404)
      }
    })
  })

  describe('createObjectStorageKey', () => {
    const region = 'us-east'
    const bucketNames = ['bucket1', 'bucket2']
    let clock: sinon.SinonFakeTimers

    beforeEach(() => {
      const fixedDate = new Date('2024-01-01T12:00:00.000Z')
      clock = sinon.useFakeTimers(fixedDate.getTime())
    })

    afterEach(() => {
      clock.restore()
    })

    it('should successfully create object storage keys', async () => {
      const mockResponse: Pick<ObjectStorageKey, 'access_key' | 'secret_key' | 'regions'> = {
        access_key: 'test-access-key',
        secret_key: 'test-secret-key',
        regions: [{ id: 'us-east', s3_endpoint: 'us-east-1.linodeobjects.com' }],
      }
      createObjectStorageKeysStub.resolves(mockResponse)
      const result = await client.createObjectStorageKey(clusterId, region, bucketNames)

      expect(createObjectStorageKeysStub.calledOnce).to.be.true
      expect(createObjectStorageKeysStub.firstCall.args[0]).to.deep.equal({
        label: `lke${clusterId}-key-2024-01-01-12:00:00`,
        regions: [region],
        bucket_access: [
          { bucket_name: 'bucket1', permissions: 'read_write', region },
          { bucket_name: 'bucket2', permissions: 'read_write', region },
        ],
      })
      expect(result).to.deep.equal(mockResponse)
    })

    it('should throw OtomiError when creation fails', async () => {
      const mockError = {
        response: {
          data: { errors: [{ reason: 'Invalid bucket configuration' }] },
          status: 400,
        },
      }
      createObjectStorageKeysStub.rejects(mockError)

      try {
        await client.createObjectStorageKey(clusterId, region, bucketNames)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).to.be.instanceOf(OtomiError)
        expect(error.publicMessage).to.equal('Invalid bucket configuration')
        expect(error.code).to.equal(400)
      }
    })
  })

  describe('createObjectStorageBucket', () => {
    const label = 'test-bucket'
    const region = 'us-east'

    it('should successfully create bucket', async () => {
      const mockResponse = { label: 'test-bucket' }
      createBucketStub.resolves(mockResponse)

      const result = await client.createObjectStorageBucket(label, region)

      expect(
        createBucketStub.calledOnceWith({
          label,
          region,
        }),
      ).to.be.true
      expect(result).to.equal('test-bucket')
    })

    it('should throw OtomiError when bucket creation fails', async () => {
      const mockError = {
        response: {
          status: 409,
          data: { errors: [{ reason: 'Bucket already exists' }] },
        },
      }
      createBucketStub.rejects(mockError)

      try {
        await client.createObjectStorageBucket(label, region)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).to.be.instanceOf(OtomiError)
        expect(error.publicMessage).to.equal('Bucket already exists')
        expect(error.code).to.equal(409)
      }
    })

    it('should throw OtomiError with default message when no specific error info', async () => {
      const mockError = {
        response: {
          status: 500,
        },
      }
      createBucketStub.rejects(mockError)

      try {
        await client.createObjectStorageBucket(label, region)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).to.be.instanceOf(OtomiError)
        expect(error.publicMessage).to.equal('Error creating object storage bucket')
        expect(error.code).to.equal(500)
      }
    })
  })
})
