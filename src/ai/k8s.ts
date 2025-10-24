import {
  AppsV1Api,
  CustomObjectsApi,
  KubeConfig,
  KubernetesObject,
  V1Deployment,
  V1StatefulSet,
} from '@kubernetes/client-node'
import Debug from 'debug'
import { KubernetesListObject } from '@kubernetes/client-node/dist/types'

const debug = Debug('otomi:ai:k8s')

let appsApiClient: AppsV1Api | undefined
let customObjectsApiClient: CustomObjectsApi | undefined

// Export function to reset api clients for testing
export function resetApiClients(): void {
  appsApiClient = undefined
  customObjectsApiClient = undefined
}

function getAppsApiClient(): AppsV1Api {
  if (appsApiClient) return appsApiClient
  const kc = new KubeConfig()
  kc.loadFromDefault()
  appsApiClient = kc.makeApiClient(AppsV1Api)
  return appsApiClient
}

function getCustomObjectsApiClient(): CustomObjectsApi {
  if (customObjectsApiClient) return customObjectsApiClient
  const kc = new KubeConfig()
  kc.loadFromDefault()
  customObjectsApiClient = kc.makeApiClient(CustomObjectsApi)
  return customObjectsApiClient
}

export type KubernetesObjectWithSpec = KubernetesObject & {
  spec: {
    [key: string]: any
  }
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

export async function getStatefulSetsWithAIModelLabels(): Promise<V1StatefulSet[]> {
  const appsApi = getAppsApiClient()

  try {
    const labelSelector = 'modelType,modelName'
    const result = await appsApi.listStatefulSetForAllNamespaces({ labelSelector })

    debug(`Found ${result.items.length} AI model statefulsets`)
    return result.items
  } catch (e) {
    debug('Error fetching statefulsets from Kubernetes:', e)
    return []
  }
}

export async function getKnowledgeBaseCNPGClusters(): Promise<KubernetesObjectWithSpec[]> {
  const customObjectsApi = getCustomObjectsApiClient()

  try {
    const labelSelector = 'apl.akamai.com/purpose=knowledge-base'
    const result = (await customObjectsApi.listClusterCustomObject({
      group: 'postgresql.cnpg.io',
      version: 'v1',
      plural: 'clusters',
      labelSelector,
    })) as KubernetesListObject<KubernetesObjectWithSpec>

    const clusters = result.items
    debug(`Found ${clusters.length} CNPG clusters for knowledge base`)
    return clusters
  } catch (e) {
    debug('Error fetching CNPG clusters from Kubernetes:', e)
    return []
  }
}

export async function getAkamaiAgentCR(namespace: string, name: string): Promise<KubernetesObject | null> {
  const customObjectsApi = getCustomObjectsApiClient()

  try {
    const result = (await customObjectsApi.getNamespacedCustomObject({
      group: 'akamai.io',
      version: 'v1alpha1',
      namespace,
      plural: 'akamaiagents',
      name,
    })) as KubernetesObject

    debug(`Found AkamaiAgent CR: ${namespace}/${name}`)
    return result
  } catch (e: any) {
    if (e.statusCode === 404) {
      debug(`AkamaiAgent CR not found: ${namespace}/${name}`)
      return null
    }
    debug(`Error fetching AkamaiAgent CR ${namespace}/${name}:`, e)
    throw e
  }
}

export async function getAkamaiKnowledgeBaseCR(namespace: string, name: string): Promise<KubernetesObject | null> {
  const customObjectsApi = getCustomObjectsApiClient()

  try {
    const result = (await customObjectsApi.getNamespacedCustomObject({
      group: 'akamai.io',
      version: 'v1alpha1',
      namespace,
      plural: 'akamaiknowledgebases',
      name,
    })) as KubernetesObject

    debug(`Found AkamaiKnowledgeBase CR: ${namespace}/${name}`)
    return result
  } catch (e: any) {
    if (e.statusCode === 404) {
      debug(`AkamaiKnowledgeBase CR not found: ${namespace}/${name}`)
      return null
    }
    debug(`Error fetching AkamaiKnowledgeBase CR ${namespace}/${name}:`, e)
    throw e
  }
}

export async function listAkamaiAgentCRs(namespace: string): Promise<KubernetesObject[]> {
  const customObjectsApi = getCustomObjectsApiClient()

  try {
    const result = (await customObjectsApi.listNamespacedCustomObject({
      group: 'akamai.io',
      version: 'v1alpha1',
      namespace,
      plural: 'akamaiagents',
    })) as KubernetesListObject<KubernetesObject>

    debug(`Found ${result.items.length} AkamaiAgent CRs in namespace ${namespace}`)
    return result.items
  } catch (e: any) {
    debug(`Error listing AkamaiAgent CRs in ${namespace}:`, e)
    return []
  }
}

export async function listAkamaiKnowledgeBaseCRs(namespace: string): Promise<KubernetesObject[]> {
  const customObjectsApi = getCustomObjectsApiClient()

  try {
    const result = (await customObjectsApi.listNamespacedCustomObject({
      group: 'akamai.io',
      version: 'v1alpha1',
      namespace,
      plural: 'akamaiknowledgebases',
    })) as KubernetesListObject<KubernetesObject>

    debug(`Found ${result.items.length} AkamaiKnowledgeBase CRs in namespace ${namespace}`)
    return result.items
  } catch (e: any) {
    debug(`Error listing AkamaiKnowledgeBase CRs in ${namespace}:`, e)
    return []
  }
}
