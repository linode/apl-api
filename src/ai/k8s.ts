import { AppsV1Api, KubeConfig, V1Deployment } from '@kubernetes/client-node'
import Debug from 'debug'

const debug = Debug('otomi:ai:k8s')

let appsApiClient: AppsV1Api | undefined

function getAppsApiClient(): AppsV1Api {
  if (appsApiClient) return appsApiClient
  const kc = new KubeConfig()
  kc.loadFromDefault()
  appsApiClient = kc.makeApiClient(AppsV1Api)
  return appsApiClient
}

export async function getDeploymentsWithAIModelLabels(): Promise<V1Deployment[]> {
  const appsApi = getAppsApiClient()

  try {
    const labelSelector = 'modelType,modelName'
    const result = await appsApi.listDeploymentForAllNamespaces({ labelSelector })

    debug(`Found ${result.items.length} AI model deployments`)
    return result.items
  } catch (e) {
    debug('Error fetching deployments from Kubernetes:', e)
    return []
  }
}
