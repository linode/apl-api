import { V1Deployment } from '@kubernetes/client-node'
import { AplAIModelResponse } from 'src/otomi-models'
import { getDeploymentsWithAIModelLabels } from './k8s'

function getConditions(deployment: V1Deployment) {
  return (deployment.status?.conditions || []).map((condition) => ({
    lastTransitionTime: condition.lastTransitionTime?.toISOString(),
    message: condition.message,
    reason: condition.reason,
    status: condition.status === 'True',
    type: condition.type,
  }))
}

export function transformK8sDeploymentToAplAIModel(deployment: V1Deployment): AplAIModelResponse {
  const labels = deployment.metadata?.labels || {}
  const modelName = deployment.metadata?.name || labels.modelName

  // Convert K8s deployment conditions to schema format
  const conditions = getConditions(deployment)

  return {
    kind: 'AplAIModel',
    metadata: {
      name: modelName,
    },
    spec: {
      displayName: modelName,
      modelEndpoint: `http://${deployment.metadata?.name}.${deployment.metadata?.namespace}.svc.cluster.local`,
      modelType: labels.modelType as 'foundation' | 'embedding',
      ...(labels.modelDimension && { modelDimension: parseInt(labels.modelDimension, 10) }),
    },
    status: {
      conditions,
      phase: deployment.status?.readyReplicas && deployment.status.readyReplicas > 0 ? 'Ready' : 'NotReady',
    },
  }
}

export async function getAIModels(): Promise<AplAIModelResponse[]> {
  const deployments = await getDeploymentsWithAIModelLabels()
  return deployments.map(transformK8sDeploymentToAplAIModel)
}
