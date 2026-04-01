import { CoreV1Api, CustomObjectsApi, KubeConfig, V1Service, VersionApi } from '@kubernetes/client-node'
import Debug from 'debug'
import {
  AplBuildResponse,
  AplServiceResponse,
  AplWorkloadResponse,
  K8sService,
  SealedSecretManifestResponse,
} from './otomi-models'

const debug = Debug('otomi:api:k8sOperations')

export async function watchPodUntilRunning(namespace: string, podName: string) {
  let isRunning = false
  const kc = new KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(CoreV1Api)

  while (!isRunning) {
    try {
      const res = await k8sApi.readNamespacedPodStatus({ name: podName, namespace })
      isRunning = res.status?.phase === 'Running'
    } catch (err) {
      const errorMessage = err.response?.body?.message ?? err.response?.body?.reason ?? 'Error checking if pod running'
      debug(`Failed to check pod status for ${podName} in namespace ${namespace}: ${errorMessage}`)
    }

    if (!isRunning) {
      debug(`Pod ${podName} is not running. Checking again in 5 seconds...`)
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }
  // wait 3 more seconds to make sure the pod is fully initialized
  await new Promise((resolve) => setTimeout(resolve, 3000))
  debug(`Pod ${podName} is now running!`)
  return true
}

export async function checkPodExists(namespace: string, podName: string): Promise<boolean> {
  const kc = new KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(CoreV1Api)

  try {
    const res = await k8sApi.readNamespacedPodStatus({ name: podName, namespace })
    return res.status?.phase === 'Running'
  } catch (err) {
    const errorMessage = err.response?.body?.message ?? err.response?.body?.reason ?? 'Error checking if pod exists'
    debug(`Failed to check pod status for ${podName} in namespace ${namespace}: ${errorMessage}`)
    return false
  }
}

export async function getKubernetesVersion() {
  if (process.env.NODE_ENV === 'development') return 'x.x.x'

  const kc = new KubeConfig()
  kc.loadFromDefault()

  const k8sApi = kc.makeApiClient(VersionApi)

  try {
    const response = await k8sApi.getCode()
    console.log('Kubernetes Server Version:', response.gitVersion)
    return response.gitVersion
  } catch (error) {
    debug(`Failed to get Kubernetes version.`)
  }
}

export function getLogTime(timestampMatch): number {
  const [, timestampString] = timestampMatch
  const dateParts = timestampString.split(' ')
  const [date, time] = dateParts
  const [year, month, day] = date.split('/')
  const [hour, minute, second] = time.split(':')
  const timestamp = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ).getTime()
  return timestamp
}

export async function getCloudttyActiveTime(namespace: string, podName: string): Promise<number | undefined> {
  const kc = new KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(CoreV1Api)
  try {
    const res = await k8sApi.readNamespacedPodLog({
      name: podName,
      namespace,
      container: 'po',
      tailLines: 3, // get the updated clients count from the last 3 lines
    })
    const lines = res.split('\n')
    const filteredLine = lines.find((line) => line.includes('clients:')) || ''
    const clientsRegex = /clients: (\d+)/
    const clientsMatch = clientsRegex.exec(filteredLine)
    const timestampRegex = /\[(.*?)\]/
    const timestampMatch = filteredLine.match(timestampRegex)

    if (clientsMatch && timestampMatch) {
      const clients = Number(clientsMatch[1])
      if (clients > 0) return 0
      const currentTime = new Date().getTime()
      const timeDifference = currentTime - getLogTime(timestampMatch)
      return timeDifference
    }
  } catch (error) {
    debug(`Failed to get active time for ${podName} in namespace ${namespace}.`)
  }
}

export async function getWorkloadStatus(workload: AplWorkloadResponse): Promise<string> {
  const kc = new KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(CustomObjectsApi)
  const { name, labels } = workload.metadata
  const teamName = labels['apl.io/teamId']
  const appName = `team-${teamName}-${name}`
  try {
    const res: any = await k8sApi.getNamespacedCustomObject({
      group: 'argoproj.io',
      version: 'v1alpha1',
      namespace: 'argocd',
      plural: 'applications',
      name: appName,
    })
    const { status } = res.status.sync
    switch (status) {
      case 'Synced':
        return 'Succeeded'
      case 'OutOfSync':
        return 'Pending'
      case 'Unknown':
        return 'Unknown'
      default:
        return 'Unknown'
    }
  } catch (error) {
    return 'NotFound'
  }
}

async function listNamespacedCustomObject(
  group: string,
  namespace: string,
  plural: string,
  labelSelector: string | undefined,
) {
  const kc = new KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(CustomObjectsApi)
  try {
    const res: any = await k8sApi.listNamespacedCustomObject({
      group,
      version: 'v1beta1',
      namespace,
      plural,
      labelSelector,
    })
    return res
  } catch (error) {
    return 'NotFound'
  }
}

export async function getBuildStatus(build: AplBuildResponse): Promise<string> {
  const { name, labels } = build.metadata
  const teamName = labels['apl.io/teamId']
  const labelSelector = `tekton.dev/pipeline=${build.spec.mode?.type}-build-${name}`
  const resPipelineruns = await listNamespacedCustomObject(
    'tekton.dev',
    `team-${teamName}`,
    'pipelineruns',
    labelSelector,
  )
  try {
    const [pipelineRun] = resPipelineruns.items
    if (pipelineRun) {
      const { conditions } = pipelineRun.status
      if (conditions && conditions.length > 0 && conditions[0].type === 'Succeeded') {
        switch (conditions[0].status) {
          case 'True':
            return 'Succeeded'
          case 'False':
            return 'Unknown'
          case 'Unknown':
            return 'NotFound'
          default:
            return 'NotFound'
        }
      } else {
        // No conditions found for the PipelineRun.
        return 'NotFound'
      }
    } else {
      const resEventlisteners = await listNamespacedCustomObject(
        'triggers.tekton.dev',
        `team-${teamName}`,
        'eventlisteners',
        labelSelector,
      )
      const [eventlistener] = resEventlisteners.items
      if (eventlistener) {
        const { conditions } = eventlistener.status
        if (conditions && conditions.length > 0) {
          return 'Pending'
        } else {
          // No conditions found for the EventListener.
          return 'Unknown'
        }
      } else {
        // 'No EventListeners found with the specified label selector.'
        return 'NotFound'
      }
    }
  } catch (error) {
    return 'NotFound'
  }
}

async function getNamespacedCustomObject(namespace: string, name: string) {
  const kc = new KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(CustomObjectsApi)
  try {
    const res: any = await k8sApi.getNamespacedCustomObject({
      group: 'networking.istio.io',
      version: 'v1beta1',
      namespace,
      plural: 'gateways',
      name,
    })
    const { hosts } = res.spec.servers[0]
    return hosts
  } catch (error) {
    return 'NotFound'
  }
}

async function checkHostStatus(namespace: string, name: string, host: string) {
  const hosts = await getNamespacedCustomObject(namespace, name)
  return hosts.includes(host) ? 'Succeeded' : 'Unknown'
}

export async function getServiceStatus(service: AplServiceResponse, domainSuffix: string): Promise<string> {
  const isKsvc = service.spec.ksvc?.predeployed
  const { name, labels } = service.metadata
  const teamName = labels['apl.io/teamId']
  const namespace = `team-${teamName}`
  const host = `team-${teamName}/${name}-${teamName}.${domainSuffix}`

  if (isKsvc) {
    const res = await listNamespacedCustomObject('networking.istio.io', namespace, 'virtualservices', undefined)
    const virtualservices = res?.items?.map((item) => item.metadata.name) || []
    if (virtualservices.includes(`${name}-ingress`)) {
      return 'Succeeded'
    } else {
      return 'NotFound'
    }
  }

  const tlstermStatus = await checkHostStatus(namespace, `team-${teamName}-public-tlsterm`, host)
  if (tlstermStatus === 'Succeeded') return 'Succeeded'

  const tlspassStatus = await checkHostStatus(namespace, `team-${teamName}-public-tlspass`, host)
  return tlspassStatus
}

export async function getSecretValues(name: string, namespace: string): Promise<Record<string, string> | undefined> {
  const kc = new KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(CoreV1Api)
  try {
    const res = await k8sApi.readNamespacedSecret({ name, namespace })
    const { data } = res
    const decodedData = {}
    Object.entries(data || {}).forEach(([key, value]) => {
      decodedData[key] = Buffer.from(value, 'base64').toString('utf-8')
    })
    return decodedData
  } catch (error) {
    if (process.env.NODE_ENV !== 'development') {
      debug(`Failed to get secret values for ${name} in ${namespace}.`)
    }
  }
}

export async function getSealedSecretSyncedStatus(name: string, namespace: string): Promise<string> {
  const kc = new KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(CustomObjectsApi)

  try {
    const res: any = await k8sApi.getNamespacedCustomObject({
      group: 'bitnami.com',
      version: 'v1alpha1',
      namespace,
      plural: 'sealedsecrets',
      name,
    })
    const { conditions } = res.status
    if (conditions && conditions.length > 0 && conditions[0].type === 'Synced') {
      switch (conditions[0].status) {
        case 'True':
          return 'Succeeded'
        case 'False':
          return 'Unknown'
        case 'Unknown':
          return 'NotFound'
        default:
          return 'NotFound'
      }
    }
    return 'NotFound'
  } catch (error) {
    if (process.env.NODE_ENV !== 'development') {
      debug(`Failed to get SealedSecret synced status for ${name} in ${namespace}.`)
    }
    return 'NotFound'
  }
}

export async function getSealedSecretStatus(sealedsecret: SealedSecretManifestResponse): Promise<string> {
  const { name, labels } = sealedsecret.metadata
  const teamName = labels['apl.io/teamId']
  const namespace = sealedsecret.spec.template?.metadata?.namespace ?? `team-${teamName}`
  const value = await getSecretValues(name, namespace)
  const syncedStatus = await getSealedSecretSyncedStatus(name, namespace)

  if (value && syncedStatus === 'Succeeded') return 'Succeeded'
  return syncedStatus
}

export async function getSealedSecretsCertificate(): Promise<string> {
  const kc = new KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(CoreV1Api)
  const namespace = 'sealed-secrets'
  const labelSelector = 'sealedsecrets.bitnami.com/sealed-secrets-key'

  try {
    const response = await k8sApi.listNamespacedSecret({ namespace, labelSelector })
    const { items } = response as any

    const newestItem = items.reduce((maxItem, currentItem) => {
      const maxTimestamp = new Date(maxItem.creationTimestamp as Date).getTime()
      const currentTimestamp = new Date(currentItem.creationTimestamp as Date).getTime()
      return currentTimestamp > maxTimestamp ? currentItem : maxItem
    }, items[0])

    if (newestItem.data['tls.crt']) {
      return Buffer.from(newestItem.data['tls.crt'], 'base64').toString('utf-8')
    } else {
      debug('Sealed secrets certificate not found!')
      return ''
    }
  } catch (error) {
    debug(`Failed to get SealedSecrets certificate.`)
    return ''
  }
}

export async function getSealedSecretsKeys(): Promise<any> {
  const kc = new KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(CoreV1Api)
  const namespace = 'sealed-secrets'
  const labelSelector = 'sealedsecrets.bitnami.com/sealed-secrets-key'

  try {
    const response = await k8sApi.listNamespacedSecret({ namespace, labelSelector })
    const { items } = response as any

    const sealedSecretsKeysJson: any = {
      apiVersion: 'v1',
      items: [],
      kind: 'List',
      metadata: {
        resourceVersion: '',
      },
    }
    for (const item of items) {
      const newItem = {
        apiVersion: 'v1',
        data: item.data,
        kind: 'Secret',
        metadata: {
          creationTimestamp: item.metadata.creationTimestamp,
          labels: item.metadata.labels,
          name: item.metadata.name,
          namespace: item.metadata.namespace,
          resourceVersion: item.metadata.resourceVersion,
          uid: item.metadata.uid,
        },
        type: item.type,
      }
      sealedSecretsKeysJson.items.push(newItem)
    }
    return sealedSecretsKeysJson
  } catch (error) {
    debug(`Failed to get SealedSecrets keys.`)
  }
}

export async function getTeamSecretsFromK8s(namespace: string) {
  const kc = new KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(CoreV1Api)
  try {
    const res: any = await k8sApi.listNamespacedSecret({ namespace })
    const secrets = res.items.map((item) => item.metadata.name)
    return secrets
  } catch (error) {
    debug(`Failed to get team secrets from k8s for ${namespace}.`)
  }
}

export function toK8sService(item: V1Service): K8sService | null {
  const knativeServiceTypeLabel = 'networking.internal.knative.dev/serviceType'
  const knativeServiceLabel = 'serving.knative.dev/service'
  const appNameLabel = 'app.kubernetes.io/name'

  const labels = item.metadata?.labels ?? {}

  // Filter out knative private services
  if (labels[knativeServiceTypeLabel] === 'Private') return null
  // Filter out services that are knative service revision
  if (item.spec?.type === 'ClusterIP' && labels[knativeServiceLabel]) return null

  let name = item.metadata?.name ?? 'unknown'
  let managedByKnative = false

  if (item.spec?.type === 'ExternalName' && labels[knativeServiceLabel]) {
    name = labels[knativeServiceLabel]
    managedByKnative = true
  }

  // Group canary services (e.g. foo-v1 and foo-v2) by their common app.kubernetes.io/name label
  const canonicalName = labels[appNameLabel] ?? name
  const ports = item.spec?.ports?.map((p) => p.port) ?? []

  return { name: canonicalName, ports, managedByKnative }
}

export function groupK8sServices(services: K8sService[]): K8sService[] {
  const grouped = new Map<string, K8sService>()

  for (const svc of services) {
    const existing = grouped.get(svc.name)
    if (existing) {
      grouped.set(svc.name, {
        ...existing,
        ports: Array.from(new Set([...(existing.ports ?? []), ...(svc.ports ?? [])])),
        managedByKnative: existing.managedByKnative || svc.managedByKnative,
      })
    } else {
      grouped.set(svc.name, svc)
    }
  }

  return Array.from(grouped.values())
}
