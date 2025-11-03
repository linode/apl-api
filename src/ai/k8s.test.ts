import { AppsV1Api, CustomObjectsApi, KubeConfig, V1Deployment } from '@kubernetes/client-node'
import {
  getDeploymentsWithAIModelLabels,
  getKnowledgeBaseCNPGClusters,
  KubernetesObjectWithSpec,
  resetApiClients,
} from './k8s'

// Mock the @kubernetes/client-node module
jest.mock('@kubernetes/client-node')

const MockedKubeConfig = KubeConfig as jest.MockedClass<typeof KubeConfig>
const MockedAppsV1Api = AppsV1Api as jest.MockedClass<typeof AppsV1Api>
const MockedCustomObjectsApi = CustomObjectsApi as jest.MockedClass<typeof CustomObjectsApi>

describe('k8s', () => {
  let mockKubeConfig: jest.Mocked<KubeConfig>
  let mockAppsV1Api: jest.Mocked<AppsV1Api>
  let mockCustomObjectsApi: jest.Mocked<CustomObjectsApi>

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset the singleton instances in the k8s module
    resetApiClients()

    mockKubeConfig = {
      loadFromDefault: jest.fn(),
      makeApiClient: jest.fn(),
    } as any

    mockAppsV1Api = {
      listDeploymentForAllNamespaces: jest.fn(),
    } as any

    mockCustomObjectsApi = {
      listClusterCustomObject: jest.fn(),
    } as any

    MockedKubeConfig.mockImplementation(() => mockKubeConfig)
    mockKubeConfig.makeApiClient.mockImplementation((ApiClass) => {
      if (ApiClass === AppsV1Api) return mockAppsV1Api
      if (ApiClass === CustomObjectsApi) return mockCustomObjectsApi
      throw new Error('Unknown API class')
    })
  })

  describe('getDeploymentsWithAIModelLabels', () => {
    const mockDeployment: V1Deployment = {
      metadata: {
        name: 'test-model',
        namespace: 'ai-models',
        labels: {
          modelName: 'gpt-4',
          modelType: 'foundation',
        },
      },
      spec: {
        replicas: 1,
        selector: { matchLabels: { app: 'test-model' } },
        template: {
          metadata: { labels: { app: 'test-model' } },
          spec: { containers: [{ name: 'model', image: 'test:latest' }] },
        },
      },
      status: {
        readyReplicas: 1,
        replicas: 1,
      },
    }

    test('should return deployments with AI model labels', async () => {
      mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
        items: [mockDeployment],
      } as any)

      const result = await getDeploymentsWithAIModelLabels()

      expect(result).toEqual([mockDeployment])
      expect(mockAppsV1Api.listDeploymentForAllNamespaces).toHaveBeenCalledWith({
        labelSelector: 'modelType,modelName',
      })
    })

    test('should return empty array when no deployments found', async () => {
      mockAppsV1Api.listDeploymentForAllNamespaces.mockResolvedValue({
        items: [],
      } as any)

      const result = await getDeploymentsWithAIModelLabels()

      expect(result).toEqual([])
    })

    test('should return empty array on K8s API error', async () => {
      const error = new Error('K8s API connection failed')
      mockAppsV1Api.listDeploymentForAllNamespaces.mockRejectedValue(error)

      const result = await getDeploymentsWithAIModelLabels()

      expect(result).toEqual([])
    })
  })

  describe('getKnowledgeBaseCNPGClusters', () => {
    const mockCNPGCluster: KubernetesObjectWithSpec = {
      apiVersion: 'postgresql.cnpg.io/v1',
      kind: 'Cluster',
      metadata: {
        name: 'pgvector-cluster',
        namespace: 'postgresql',
        labels: {
          'apl.akamai.com/purpose': 'knowledge-base',
        },
      },
      spec: {
        instances: 1,
        postgresql: {
          parameters: {
            max_connections: '100',
          },
        },
      },
    }

    test('should return CNPG clusters with knowledge-base purpose', async () => {
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [mockCNPGCluster],
      } as any)

      const result = await getKnowledgeBaseCNPGClusters()

      expect(result).toEqual([mockCNPGCluster])
      expect(mockCustomObjectsApi.listClusterCustomObject).toHaveBeenCalledWith({
        group: 'postgresql.cnpg.io',
        version: 'v1',
        plural: 'clusters',
        labelSelector: 'apl.akamai.com/purpose=knowledge-base',
      })
    })

    test('should return empty array when no clusters found', async () => {
      mockCustomObjectsApi.listClusterCustomObject.mockResolvedValue({
        items: [],
      } as any)

      const result = await getKnowledgeBaseCNPGClusters()

      expect(result).toEqual([])
    })

    test('should return empty array on K8s API error', async () => {
      const error = new Error('Custom resource API error')
      mockCustomObjectsApi.listClusterCustomObject.mockRejectedValue(error)

      const result = await getKnowledgeBaseCNPGClusters()

      expect(result).toEqual([])
    })
  })
})
