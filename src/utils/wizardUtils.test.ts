import axios, { AxiosInstance } from 'axios'
import { expect } from 'chai'
import { stub as sinonStub } from 'sinon'
import { OtomiError } from 'src/error'
import { createObjectStorageAccessKey, createObjectStorageBucket, getClusterRegion } from './wizardUtils'

describe('wizardUtils', () => {
  let axiosCreateStub: sinon.SinonStub
  let getStub: sinon.SinonStub
  let postStub: sinon.SinonStub

  beforeEach(() => {
    getStub = sinonStub()
    postStub = sinonStub()
    axiosCreateStub = sinonStub(axios, 'create').returns({
      get: getStub,
      post: postStub,
    } as any as AxiosInstance)
  })

  afterEach(() => {
    axiosCreateStub.restore()
  })

  describe('getClusterRegion', () => {
    it('should return the cluster region on success', async () => {
      const mockResponse = { data: { region: 'us-east' } }
      getStub.resolves(mockResponse)

      const region = await getClusterRegion('linodeToken', 'linodeClusterId')
      expect(region).to.equal('us-east')
    })

    it('should throw an OtomiError on failure', async () => {
      const mockError = {
        response: {
          data: { errors: [{ reason: 'Not found' }] },
          status: 404,
        },
      }
      getStub.rejects(mockError)

      try {
        await getClusterRegion('linodeToken', 'linodeClusterId')
      } catch (err) {
        expect(err).to.be.instanceOf(OtomiError)
        expect(err.publicMessage).to.equal('Not found')
        expect(err.code).to.equal(404)
      }
    })
  })

  describe('createObjectStorageAccessKey', () => {
    it('should return the access key on success', async () => {
      const mockResponse = {
        data: {
          access_key: 'linodeAccessKey',
          secret_key: 'linodeSecretKey',
          regions: [{ id: 'us-east', s3_endpoint: 'us-east-1.linodeobjects.com' }],
        },
      }
      postStub.resolves(mockResponse)

      const key = await createObjectStorageAccessKey('linodeToken', 'linodeClusterId', 'us-east')
      expect(key).to.deep.equal(mockResponse.data)
    })

    it('should throw an OtomiError on failure', async () => {
      const mockError = {
        response: {
          data: { errors: [{ reason: 'Invalid request' }] },
          status: 400,
        },
      }
      postStub.rejects(mockError)

      try {
        await createObjectStorageAccessKey('linodeToken', 'linodeClusterId', 'us-east')
      } catch (err) {
        expect(err).to.be.instanceOf(OtomiError)
        expect(err.publicMessage).to.equal('Invalid request')
        expect(err.code).to.equal(400)
      }
    })
  })

  describe('createObjectStorageBucket', () => {
    it('should return the bucket on success', async () => {
      const mockResponse = { data: { label: 'linodeBucket' } }
      postStub.resolves(mockResponse)

      const bucket = await createObjectStorageBucket('linodeToken', 'linodeBucket', 'us-east')
      expect(bucket).to.deep.equal(mockResponse.data)
    })

    it('should throw an OtomiError on failure', async () => {
      const mockError = {
        response: {
          data: { errors: [{ reason: 'Invalid request' }] },
          status: 400,
        },
      }
      postStub.rejects(mockError)

      try {
        await createObjectStorageBucket('linodeToken', 'linodeBucket', 'us-east')
      } catch (err) {
        expect(err).to.be.instanceOf(OtomiError)
        expect(err.publicMessage).to.equal('Invalid request')
        expect(err.code).to.equal(400)
      }
    })
  })
})
