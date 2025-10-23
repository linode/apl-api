import { AkamaiKnowledgeBaseCR } from './AkamaiKnowledgeBaseCR'
import { AplKnowledgeBaseRequest } from 'src/otomi-models'
import { K8sResourceNotFound } from '../error'
import * as aiModelHandler from './aiModelHandler'

// Mock the aiModelHandler module
jest.mock('./aiModelHandler')
const mockedGetAIModels = aiModelHandler.getAIModels as jest.MockedFunction<typeof aiModelHandler.getAIModels>

describe('AkamaiKnowledgeBaseCR', () => {
  const mockEmbeddingModel = {
    kind: 'AplAIModel',
    metadata: { name: 'text-embedding-ada-002' },
    spec: {
      displayName: 'Text Embedding Ada 002',
      modelEndpoint: 'http://embedding-model.ai.svc.cluster.local',
      modelType: 'embedding' as const,
      modelDimension: 1536,
    },
    status: {
      conditions: [],
      phase: 'Ready' as const,
    },
  }

  const mockKnowledgeBaseRequest: AplKnowledgeBaseRequest = {
    kind: 'AkamaiKnowledgeBase',
    metadata: {
      name: 'test-kb',
    },
    spec: {
      modelName: 'text-embedding-ada-002',
      sourceUrl: 'https://docs.example.com',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    test('should create AkamaiKnowledgeBaseCR with all properties', () => {
      const kbCR = new AkamaiKnowledgeBaseCR(
        'team-123',
        'test-kb',
        'cluster-name',
        mockKnowledgeBaseRequest,
        mockEmbeddingModel,
      )

      expect(kbCR.apiVersion).toBeDefined()
      expect(kbCR.kind).toBeDefined()
      expect(kbCR.metadata.name).toBe('test-kb')
      expect(kbCR.metadata.namespace).toBe('team-team-123')
      expect(kbCR.spec.pipelineName).toBeDefined()
      expect(kbCR.spec.pipelineParameters).toBeDefined()
    })

    test('should set pipeline parameters correctly', () => {
      const kbCR = new AkamaiKnowledgeBaseCR(
        'team-123',
        'test-kb',
        'cluster-name',
        mockKnowledgeBaseRequest,
        mockEmbeddingModel,
      )

      expect(kbCR.spec.pipelineParameters).toEqual({
        url: 'https://docs.example.com',
        table_name: 'test-kb',
        embedding_model: 'nvidia/text-embedding-ada-002',
        embedding_api_base: 'http://embedding-model.ai.svc.cluster.local',
        embed_dim: 1536,
        embed_batch_size: expect.any(Number),
        secret_name: expect.stringContaining('cluster-name'),
        secret_namespace: 'team-team-123',
      })
    })

    test('should use default embed dimension when model dimension not provided', () => {
      const modelWithoutDimension = {
        ...mockEmbeddingModel,
        spec: {
          ...mockEmbeddingModel.spec,
          modelDimension: undefined,
        },
      }

      const kbCR = new AkamaiKnowledgeBaseCR(
        'team-123',
        'test-kb',
        'cluster-name',
        mockKnowledgeBaseRequest,
        modelWithoutDimension,
      )

      expect(kbCR.spec.pipelineParameters.embed_dim).toBeDefined()
      expect(typeof kbCR.spec.pipelineParameters.embed_dim).toBe('number')
    })
  })

  describe('toRecord', () => {
    test('should return serializable record', () => {
      const kbCR = new AkamaiKnowledgeBaseCR(
        'team-123',
        'test-kb',
        'cluster-name',
        mockKnowledgeBaseRequest,
        mockEmbeddingModel,
      )
      const record = kbCR.toRecord()

      expect(record).toEqual({
        apiVersion: kbCR.apiVersion,
        kind: kbCR.kind,
        metadata: kbCR.metadata,
        spec: kbCR.spec,
      })
    })
  })

  describe('toApiResponse', () => {
    test('should transform to API response format', () => {
      const kbCR = new AkamaiKnowledgeBaseCR(
        'team-123',
        'test-kb',
        'cluster-name',
        mockKnowledgeBaseRequest,
        mockEmbeddingModel,
      )
      const response = kbCR.toApiResponse('team-123')

      expect(response.kind).toBe('AkamaiKnowledgeBase')
      expect(response.metadata.name).toBe('test-kb')
      expect(response.metadata.labels?.['apl.io/teamId']).toBe('team-123')
      expect(response.spec.modelName).toBe('nvidia/text-embedding-ada-002')
      expect(response.spec.sourceUrl).toBe('https://docs.example.com')
      expect(response.status).toEqual({})
    })

    test('should set teamId label and not include custom labels in response', () => {
      const kbCR = new AkamaiKnowledgeBaseCR(
        'team-123',
        'test-kb',
        'cluster-name',
        mockKnowledgeBaseRequest,
        mockEmbeddingModel,
      )
      const response = kbCR.toApiResponse('team-123')

      expect(response.metadata.labels).toEqual({
        'apl.io/teamId': 'team-123',
      })
      // Custom labels from metadata are not merged in toApiResponse
      expect(response.metadata.labels?.['custom-label']).toBeUndefined()
    })
  })

  describe('create', () => {
    test('should create AkamaiKnowledgeBaseCR when embedding model exists', async () => {
      mockedGetAIModels.mockResolvedValue([mockEmbeddingModel as any])

      const result = await AkamaiKnowledgeBaseCR.create('team-123', 'test-kb', 'cluster-name', mockKnowledgeBaseRequest)

      expect(result).toBeInstanceOf(AkamaiKnowledgeBaseCR)
      expect(result.metadata.name).toBe('test-kb')
      expect(mockedGetAIModels).toHaveBeenCalledTimes(1)
    })

    test('should throw K8sResourceNotFound when embedding model does not exist', async () => {
      mockedGetAIModels.mockResolvedValue([])

      await expect(
        AkamaiKnowledgeBaseCR.create('team-123', 'test-kb', 'cluster-name', mockKnowledgeBaseRequest),
      ).rejects.toThrow(K8sResourceNotFound)

      await expect(
        AkamaiKnowledgeBaseCR.create('team-123', 'test-kb', 'cluster-name', mockKnowledgeBaseRequest),
      ).rejects.toThrow("Embedding model 'text-embedding-ada-002' not found")
    })

    test('should throw K8sResourceNotFound when model exists but is not embedding type', async () => {
      const foundationModel = {
        ...mockEmbeddingModel,
        spec: {
          ...mockEmbeddingModel.spec,
          modelType: 'foundation' as const,
        },
      }
      mockedGetAIModels.mockResolvedValue([foundationModel as any])

      await expect(
        AkamaiKnowledgeBaseCR.create('team-123', 'test-kb', 'cluster-name', mockKnowledgeBaseRequest),
      ).rejects.toThrow(K8sResourceNotFound)
    })

    test('should find correct embedding model among multiple models', async () => {
      const foundationModel = {
        kind: 'AplAIModel',
        metadata: { name: 'gpt-4' },
        spec: {
          displayName: 'GPT-4',
          modelEndpoint: 'http://gpt-4.ai.svc.cluster.local',
          modelType: 'foundation' as const,
        },
        status: { conditions: [], phase: 'Ready' as const },
      }

      const wrongEmbeddingModel = {
        ...mockEmbeddingModel,
        metadata: { name: 'different-embedding-model' },
      }

      mockedGetAIModels.mockResolvedValue([foundationModel as any, wrongEmbeddingModel, mockEmbeddingModel])

      const result = await AkamaiKnowledgeBaseCR.create('team-123', 'test-kb', 'cluster-name', mockKnowledgeBaseRequest)

      expect(result).toBeInstanceOf(AkamaiKnowledgeBaseCR)
      expect(result.spec.pipelineParameters.embedding_model).toBe('nvidia/text-embedding-ada-002')
    })

    test('should handle AI models fetch error', async () => {
      const error = new Error('K8s API error')
      mockedGetAIModels.mockRejectedValue(error)

      await expect(
        AkamaiKnowledgeBaseCR.create('team-123', 'test-kb', 'cluster-name', mockKnowledgeBaseRequest),
      ).rejects.toThrow('K8s API error')
    })
  })

  describe('fromCR', () => {
    test('should create instance from existing CR object', () => {
      const crObject = {
        apiVersion: 'akamai.com/v1',
        kind: 'KnowledgeBase',
        metadata: { name: 'existing-kb', namespace: 'team-456' },
        spec: {
          pipelineName: 'test-pipeline',
          pipelineParameters: {
            url: 'https://example.com',
            table_name: 'existing-kb',
            embedding_model: 'test-model',
            embedding_api_base: 'http://test-model.ai.svc.cluster.local',
            embed_dim: 768,
            embed_batch_size: 100,
            secret_name: 'test-secret',
            secret_namespace: 'team-456',
          },
        },
      }

      const result = AkamaiKnowledgeBaseCR.fromCR(crObject)

      expect(result).toBeInstanceOf(AkamaiKnowledgeBaseCR)
      expect(result.metadata.name).toBe('existing-kb')
      expect(result.spec.pipelineParameters.embedding_model).toBe('test-model')
    })
  })
})
