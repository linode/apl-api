import { V1Deployment, V1StatefulSet } from '@kubernetes/client-node'
import { AplAIModelResponse } from 'src/otomi-models'
import { getDeploymentsWithAIModelLabels, getStatefulSetsWithAIModelLabels } from './k8s'

type K8sWorkload = V1Deployment | V1StatefulSet

function getConditions(workload: K8sWorkload) {
  return (workload.status?.conditions || []).map((condition) => ({
    lastTransitionTime: condition.lastTransitionTime?.toISOString(),
    message: condition.message,
    reason: condition.reason,
    status: condition.status === 'True',
    type: condition.type,
  }))
}

export function transformK8sWorkloadToAplAIModel(workload: K8sWorkload): AplAIModelResponse {
  const labels = workload.metadata?.labels || {}
  const modelName = labels.modelName || workload.metadata?.name || ''
  const endpointName = labels['serving.knative.dev/service'] || workload.metadata?.name || ''

  // Use /openai/v1 for Knative services, /v1 for regular deployments
  const endpointPath = labels['serving.knative.dev/service'] ? '/openai/v1' : '/v1'

  // Convert K8s workload conditions to schema format
  const conditions = getConditions(workload)

  return {
    kind: 'AplAIModel',
    metadata: {
      name: modelName,
    },
    spec: {
      displayName: modelName,
      modelEndpoint: `http://${endpointName}.${workload.metadata?.namespace}.svc.cluster.local${endpointPath}`,
      modelType: labels.modelType as 'foundation' | 'embedding',
      ...(labels.modelDimension && { modelDimension: parseInt(labels.modelDimension, 10) }),
    },
    status: {
      conditions,
      phase: workload.status?.readyReplicas && workload.status.readyReplicas > 0 ? 'Ready' : 'NotReady',
    },
  }
}

export async function getAIModels(): Promise<AplAIModelResponse[]> {
  const [deployments, statefulSets] = await Promise.all([
    getDeploymentsWithAIModelLabels(),
    getStatefulSetsWithAIModelLabels(),
  ])

  const allWorkloads: K8sWorkload[] = [...deployments, ...statefulSets]
  return allWorkloads.map(transformK8sWorkloadToAplAIModel)
}
