import { V1Deployment } from '@kubernetes/client-node'
import { getAIModels, transformK8sDeploymentToAplAIModel } from './aiModelHandler'
import * as k8s from './k8s'

// Mock the k8s module
jest.mock('./k8s')
const mockedGetDeploymentsWithAIModelLabels = k8s.getDeploymentsWithAIModelLabels as jest.MockedFunction<
  typeof k8s.getDeploymentsWithAIModelLabels
>

describe('aiModelHandler', () => {
  const mockDeployment: V1Deployment = {
    metadata: {
      name: 'gpt-4-deployment',
      namespace: 'ai-models',
      labels: {
        app: 'gpt-4',
        modelName: 'gpt-4',
        modelNameTitle: 'GPT-4o-mini',
        modelType: 'foundation',
        modelDimension: '1536',
      },
    },
    status: {
      conditions: [
        {
          type: 'Available',
          status: 'True',
          reason: 'MinimumReplicasAvailable',
          message: 'Deployment has minimum availability.',
          lastTransitionTime: new Date('2023-01-01T10:00:00Z'),
        },
        {
          type: 'Progressing',
          status: 'True',
          reason: 'NewReplicaSetAvailable',
          message: 'ReplicaSet has successfully progressed.',
          lastTransitionTime: new Date('2023-01-01T10:00:00Z'),
        },
      ],
      readyReplicas: 1,
      replicas: 1,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('transformK8sDeploymentToAplAIModel', () => {
    test('should transform K8s deployment to AplAIModel with all fields', () => {
      const result = transformK8sDeploymentToAplAIModel(mockDeployment)

      expect(result).toEqual({
        kind: 'AplAIModel',
        metadata: {
          name: 'gpt-4',
        },
        spec: {
          displayName: 'GPT-4o-mini',
          modelEndpoint: 'http://gpt-4.ai-models.svc.cluster.local/openai/v1',
          modelType: 'foundation',
          modelDimension: 1536,
        },
        status: {
          conditions: [
            {
              lastTransitionTime: '2023-01-01T10:00:00.000Z',
              message: 'Deployment has minimum availability.',
              reason: 'MinimumReplicasAvailable',
              status: true,
              type: 'Available',
            },
            {
              lastTransitionTime: '2023-01-01T10:00:00.000Z',
              message: 'ReplicaSet has successfully progressed.',
              reason: 'NewReplicaSetAvailable',
              status: true,
              type: 'Progressing',
            },
          ],
          phase: 'Ready',
        },
      })
    })

    test('should use deployment name over modelName label', () => {
      const deploymentWithModelName = {
        ...mockDeployment,
        metadata: {
          ...mockDeployment.metadata,
          name: 'some-deployment-name',
          labels: {
            ...mockDeployment.metadata?.labels,
            modelName: 'custom-model-name',
          },
        },
      }

      const result = transformK8sDeploymentToAplAIModel(deploymentWithModelName)

      expect(result.metadata.name).toBe('custom-model-name')
      expect(result.spec.displayName).toBe('GPT-4o-mini')
    })

    test('should use modelName from labels when deployment name is missing', () => {
      const deploymentWithoutName = {
        ...mockDeployment,
        metadata: {
          ...mockDeployment.metadata,
          name: undefined,
          labels: {
            ...mockDeployment.metadata?.labels,
            modelName: 'custom-model-name',
          },
        },
      }

      const result = transformK8sDeploymentToAplAIModel(deploymentWithoutName)

      expect(result.metadata.name).toBe('custom-model-name')
      expect(result.spec.displayName).toBe('GPT-4o-mini')
    })

    test('should handle deployment without labels', () => {
      const deploymentWithoutLabels = {
        ...mockDeployment,
        metadata: {
          name: 'test-deployment',
          namespace: 'test-namespace',
        },
      }

      const result = transformK8sDeploymentToAplAIModel(deploymentWithoutLabels)

      expect(result.metadata.name).toBe('test-deployment')
      expect(result.spec.modelType).toBeUndefined()
      expect(result.spec.modelDimension).toBeUndefined()
    })

    test('should handle deployment without modelDimension', () => {
      const deploymentWithoutDimension = {
        ...mockDeployment,
        metadata: {
          ...mockDeployment.metadata,
          labels: {
            modelName: 'test-model',
            modelType: 'embedding',
          },
        },
      }

      const result = transformK8sDeploymentToAplAIModel(deploymentWithoutDimension)

      expect(result.spec.modelDimension).toBeUndefined()
    })

    test('should handle deployment without namespace', () => {
      const deploymentWithoutNamespace = {
        ...mockDeployment,
        metadata: {
          name: 'test-deployment',
          labels: mockDeployment.metadata?.labels,
        },
      }

      const result = transformK8sDeploymentToAplAIModel(deploymentWithoutNamespace)

      expect(result.spec.modelEndpoint).toBe('http://gpt-4.undefined.svc.cluster.local/openai/v1')
    })

    test('should handle deployment without status conditions', () => {
      const deploymentWithoutConditions = {
        ...mockDeployment,
        status: {
          readyReplicas: 0,
          replicas: 1,
        },
      }

      const result = transformK8sDeploymentToAplAIModel(deploymentWithoutConditions)

      expect(result.status.conditions).toEqual([])
      expect(result.status.phase).toBe('NotReady')
    })

    test('should set phase to NotReady when no ready replicas', () => {
      const notReadyDeployment = {
        ...mockDeployment,
        status: {
          ...mockDeployment.status,
          readyReplicas: 0,
        },
      }

      const result = transformK8sDeploymentToAplAIModel(notReadyDeployment)

      expect(result.status.phase).toBe('NotReady')
    })

    test('should set phase to Ready when has ready replicas', () => {
      const result = transformK8sDeploymentToAplAIModel(mockDeployment)

      expect(result.status.phase).toBe('Ready')
    })

    test('should handle condition status string conversion', () => {
      const deploymentWithFalseCondition = {
        ...mockDeployment,
        status: {
          ...mockDeployment.status,
          conditions: [
            {
              type: 'Available',
              status: 'False',
              reason: 'MinimumReplicasUnavailable',
              message: 'Deployment does not have minimum availability.',
              lastTransitionTime: new Date('2023-01-01T10:00:00Z'),
            },
          ],
        },
      }

      const result = transformK8sDeploymentToAplAIModel(deploymentWithFalseCondition)

      expect(result.status.conditions?.[0]?.status).toBe(false)
    })

    test('should handle missing metadata', () => {
      const deploymentWithoutMetadata = {
        status: mockDeployment.status,
      } as V1Deployment

      const result = transformK8sDeploymentToAplAIModel(deploymentWithoutMetadata)

      expect(result.metadata.name).toBe('')
      expect(result.spec.modelEndpoint).toBe('http://.undefined.svc.cluster.local/openai/v1')
    })
  })

  describe('getAIModels', () => {
    test('should return transformed AI models from deployments', async () => {
      mockedGetDeploymentsWithAIModelLabels.mockResolvedValue([mockDeployment])

      const result = await getAIModels()

      expect(result).toHaveLength(1)
      expect(result[0].kind).toBe('AplAIModel')
      expect(result[0].metadata.name).toBe('gpt-4')
      expect(mockedGetDeploymentsWithAIModelLabels).toHaveBeenCalledTimes(1)
    })

    test('should return empty array when no deployments found', async () => {
      mockedGetDeploymentsWithAIModelLabels.mockResolvedValue([])

      const result = await getAIModels()

      expect(result).toEqual([])
      expect(mockedGetDeploymentsWithAIModelLabels).toHaveBeenCalledTimes(1)
    })

    test('should handle multiple deployments', async () => {
      const secondDeployment = {
        ...mockDeployment,
        metadata: {
          ...mockDeployment.metadata,
          name: 'embedding-model',
          labels: {
            modelName: 'text-embedding-ada-002',
            modelType: 'embedding',
            modelDimension: '1536',
          },
        },
      }

      mockedGetDeploymentsWithAIModelLabels.mockResolvedValue([mockDeployment, secondDeployment])

      const result = await getAIModels()

      expect(result).toHaveLength(2)
      expect(result[0].metadata.name).toBe('gpt-4')
      expect(result[1].metadata.name).toBe('text-embedding-ada-002')
    })

    test('should propagate errors from k8s module', async () => {
      const error = new Error('K8s API error')
      mockedGetDeploymentsWithAIModelLabels.mockRejectedValue(error)

      await expect(getAIModels()).rejects.toThrow('K8s API error')
    })
  })
})
