import { AkamaiAgentCR } from './AkamaiAgentCR'
import { AplAgentRequest } from 'src/otomi-models'
import { K8sResourceNotFound } from '../error'
import * as aiModelHandler from './aiModelHandler'

// Mock the aiModelHandler module
jest.mock('./aiModelHandler')
const mockedGetAIModels = aiModelHandler.getAIModels as jest.MockedFunction<typeof aiModelHandler.getAIModels>

describe('AkamaiAgentCR', () => {
  const mockFoundationModel = {
    kind: 'AplAIModel',
    metadata: { name: 'gpt-4' },
    spec: {
      displayName: 'GPT-4',
      modelEndpoint: 'http://gpt-4.ai.svc.cluster.local',
      modelType: 'foundation' as const,
    },
    status: {
      conditions: [],
      phase: 'Ready' as const,
    },
  }

  const mockAgentRequest: AplAgentRequest = {
    kind: 'AkamaiAgent',
    metadata: {
      name: 'test-agent',
    },
    spec: {
      foundationModel: 'gpt-4',
      agentInstructions: 'You are a helpful assistant',
      tools: [
        {
          type: 'knowledgeBase',
          name: 'test-kb',
        },
      ],
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    test('should create AkamaiAgentCR with all properties', () => {
      const agentCR = new AkamaiAgentCR('team-123', 'test-agent', mockAgentRequest)

      expect(agentCR.apiVersion).toBeDefined()
      expect(agentCR.kind).toBeDefined()
      expect(agentCR.metadata.name).toBe('test-agent')
      expect(agentCR.metadata.namespace).toBe('team-team-123')
      expect(agentCR.metadata.labels?.['apl.io/teamId']).toBe('team-123')
      expect(agentCR.spec.foundationModel).toBe('gpt-4')
      expect(agentCR.spec.agentInstructions).toBe('You are a helpful assistant')
      expect(agentCR.spec.tools).toEqual([
        {
          type: 'knowledgeBase',
          name: 'test-kb',
          description:
            'Search the test-kb knowledge base for relevant information. Use this when you need factual information, documentation, or specific details stored in the knowledge base.',
          endpoint: undefined,
        },
      ])
    })

    test('should set teamId label and not merge custom labels', () => {
      const agentCR = new AkamaiAgentCR('team-123', 'test-agent', mockAgentRequest)

      expect(agentCR.metadata.labels).toEqual({
        'apl.io/teamId': 'team-123',
      })
      // Custom labels from request are not merged in constructor
      expect(agentCR.metadata.labels?.['custom-label']).toBeUndefined()
    })

    test('should handle request without tools', () => {
      const requestWithoutTools = {
        ...mockAgentRequest,
        spec: {
          ...mockAgentRequest.spec,
          tools: undefined,
        },
      }

      const agentCR = new AkamaiAgentCR('team-123', 'test-agent', requestWithoutTools)

      expect(agentCR.spec.tools).toBeUndefined()
    })

    test('should handle tools with custom description', () => {
      const requestWithDescription = {
        ...mockAgentRequest,
        spec: {
          ...mockAgentRequest.spec,
          tools: [
            {
              type: 'knowledgeBase',
              name: 'test-kb',
              description: 'Custom description for the knowledge base',
            },
          ],
        },
      }

      const agentCR = new AkamaiAgentCR('team-123', 'test-agent', requestWithDescription)

      expect(agentCR.spec.tools).toEqual([
        {
          type: 'knowledgeBase',
          name: 'test-kb',
          description: 'Custom description for the knowledge base',
          endpoint: undefined,
        },
      ])
    })
  })

  describe('toRecord', () => {
    test('should return serializable record', () => {
      const agentCR = new AkamaiAgentCR('team-123', 'test-agent', mockAgentRequest)
      const record = agentCR.toRecord()

      expect(record).toEqual({
        apiVersion: agentCR.apiVersion,
        kind: agentCR.kind,
        metadata: agentCR.metadata,
        spec: agentCR.spec,
      })
    })
  })

  describe('toApiResponse', () => {
    test('should transform to API response format', () => {
      const agentCR = new AkamaiAgentCR('team-123', 'test-agent', mockAgentRequest)
      const response = agentCR.toApiResponse('team-123')

      expect(response).toEqual({
        kind: 'AkamaiAgent',
        metadata: {
          name: 'test-agent',
          namespace: 'team-team-123',
          labels: {
            'apl.io/teamId': 'team-123',
          },
        },
        spec: {
          foundationModel: 'gpt-4',
          agentInstructions: 'You are a helpful assistant',
          tools: [
            {
              type: 'knowledgeBase',
              name: 'test-kb',
              description:
                'Search the test-kb knowledge base for relevant information. Use this when you need factual information, documentation, or specific details stored in the knowledge base.',
              endpoint: undefined,
            },
          ],
        },
        status: {
          conditions: [
            {
              type: 'AgentDeployed',
              status: true,
              reason: 'Scheduled',
              message: 'Successfully deployed the Agent',
            },
          ],
        },
      })
    })

    test('should handle empty tools array in response', () => {
      const requestWithoutTools = {
        ...mockAgentRequest,
        spec: {
          ...mockAgentRequest.spec,
          tools: undefined,
        },
      }

      const agentCR = new AkamaiAgentCR('team-123', 'test-agent', requestWithoutTools)
      const response = agentCR.toApiResponse('team-123')

      expect(response.spec.tools).toBeUndefined()
    })

    test('should preserve custom description and endpoint in response', () => {
      const requestWithDetails = {
        ...mockAgentRequest,
        spec: {
          ...mockAgentRequest.spec,
          tools: [
            {
              type: 'knowledgeBase',
              name: 'test-kb',
              description: 'Custom KB description',
              endpoint: 'https://api.example.com/kb',
            },
          ],
        },
      }

      const agentCR = new AkamaiAgentCR('team-123', 'test-agent', requestWithDetails)
      const response = agentCR.toApiResponse('team-123')

      expect(response.spec.tools).toEqual([
        {
          type: 'knowledgeBase',
          name: 'test-kb',
          description: 'Custom KB description',
          endpoint: 'https://api.example.com/kb',
        },
      ])
    })
  })

  describe('create', () => {
    test('should create AkamaiAgentCR when foundation model exists', async () => {
      mockedGetAIModels.mockResolvedValue([mockFoundationModel as any])

      const result = await AkamaiAgentCR.create('team-123', 'test-agent', mockAgentRequest)

      expect(result).toBeInstanceOf(AkamaiAgentCR)
      expect(result.metadata.name).toBe('test-agent')
      expect(mockedGetAIModels).toHaveBeenCalledTimes(1)
    })

    test('should throw K8sResourceNotFound when foundation model does not exist', async () => {
      mockedGetAIModels.mockResolvedValue([])

      await expect(AkamaiAgentCR.create('team-123', 'test-agent', mockAgentRequest)).rejects.toThrow(
        K8sResourceNotFound,
      )
      await expect(AkamaiAgentCR.create('team-123', 'test-agent', mockAgentRequest)).rejects.toThrow(
        "Foundation model 'gpt-4' not found",
      )
    })

    test('should throw K8sResourceNotFound when foundation model has wrong type', async () => {
      const embeddingModel = {
        ...mockFoundationModel,
        spec: {
          ...mockFoundationModel.spec,
          modelType: 'embedding' as const,
        },
      }
      mockedGetAIModels.mockResolvedValue([embeddingModel as any])

      await expect(AkamaiAgentCR.create('team-123', 'test-agent', mockAgentRequest)).rejects.toThrow(
        K8sResourceNotFound,
      )
    })

    test('should throw error when foundationModel is undefined', async () => {
      const requestWithoutModel = {
        ...mockAgentRequest,
        spec: {
          ...mockAgentRequest.spec,
          foundationModel: undefined,
        },
      }

      mockedGetAIModels.mockResolvedValue([mockFoundationModel as any])

      await expect(AkamaiAgentCR.create('team-123', 'test-agent', requestWithoutModel as any)).rejects.toThrow(
        K8sResourceNotFound,
      )
      await expect(AkamaiAgentCR.create('team-123', 'test-agent', requestWithoutModel as any)).rejects.toThrow(
        "Foundation model 'undefined' not found",
      )
    })
  })

  describe('fromCR', () => {
    test('should create instance from existing CR object', () => {
      const crObject = {
        apiVersion: 'akamai.com/v1',
        kind: 'Agent',
        metadata: { name: 'existing-agent', namespace: 'team-456' },
        spec: { foundationModel: 'gpt-3.5', agentInstructions: 'Test prompt' },
      }

      const result = AkamaiAgentCR.fromCR(crObject)

      expect(result).toBeInstanceOf(AkamaiAgentCR)
      expect(result.metadata.name).toBe('existing-agent')
      expect(result.spec.foundationModel).toBe('gpt-3.5')
    })
  })
})
