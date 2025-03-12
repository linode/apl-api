import * as k8s from '@kubernetes/client-node'
import Debug from 'debug'
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { promisify } from 'util'
import { Build, Cloudtty, SealedSecret, Service, Workload } from './otomi-models'

const debug = Debug('otomi:api:k8sOperations')

/**
 * Replicate the functionality of `kubectl apply`.  That is, create the resources defined in the `specFile` if they do
 * not exist, patch them if they do exist.
 *
 * @param specPath File system path to a YAML Kubernetes spec.
 * @return Array of resources created
 */
export async function apply(specPath: string): Promise<k8s.KubernetesObject[]> {
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()
  const client = k8s.KubernetesObjectApi.makeApiClient(kc) as any
  const fsReadFileP = promisify(fs.readFile)
  const specString = await fsReadFileP(specPath, 'utf8')
  const specs: any = yaml.loadAll(specString)
  const validSpecs = specs.filter((s) => s && s.kind && s.metadata)
  const created: k8s.KubernetesObject[] = []
  for (const spec of validSpecs) {
    // this is to convince the old version of TypeScript that metadata exists even though we already filtered specs
    // without metadata out
    spec.metadata = spec.metadata || {}
    spec.metadata.annotations = spec.metadata.annotations || {}
    delete spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration']
    spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'] = JSON.stringify(spec)
    try {
      // try to get the resource, if it does not exist an error will be thrown and we will end up in the catch
      // block.
      await client.read(spec)
      // we got the resource, so it exists, so patch it
      //
      // Note that this could fail if the spec refers to a custom resource. For custom resources you may need
      // to specify a different patch merge strategy in the content-type header.
      //
      // See: https://github.com/kubernetes/kubernetes/issues/97423
      const response = await client.patch(spec)
      created.push(response.body)
    } catch (e) {
      // we did not get the resource, so it does not exist, so create it
      const response = await client.create(spec)
      created.push(response.body)
    }
  }
  debug(`Cloudtty is created!`)
  return created
}

export async function watchPodUntilRunning(namespace: string, podName: string) {
  let isRunning = false
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api)

  while (!isRunning) {
    try {
      const res = await k8sApi.readNamespacedPodStatus(podName, namespace)
      isRunning = res.body.status?.phase === 'Running'
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
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api)

  try {
    const res = await k8sApi.readNamespacedPodStatus(podName, namespace)
    return res.body.status?.phase === 'Running'
  } catch (err) {
    const errorMessage = err.response?.body?.message ?? err.response?.body?.reason ?? 'Error checking if pod exists'
    debug(`Failed to check pod status for ${podName} in namespace ${namespace}: ${errorMessage}`)
    return false
  }
}

export async function k8sdelete({ emailNoSymbols, isAdmin, userTeams }: Cloudtty) {
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api)
  const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi)
  const rbacAuthorizationV1Api = kc.makeApiClient(k8s.RbacAuthorizationV1Api)
  const resourceName = emailNoSymbols
  const namespace = 'team-admin'
  try {
    const apiVersion = 'v1beta1'
    const apiGroupAuthz = 'security.istio.io'
    const apiGroupVS = 'networking.istio.io'
    const pluralAuth = 'authorizationpolicies'
    const pluralVS = 'virtualservices'

    await customObjectsApi.deleteNamespacedCustomObject(
      apiGroupAuthz,
      apiVersion,
      namespace,
      pluralAuth,
      `tty-${resourceName}`,
    )

    await k8sApi.deleteNamespacedServiceAccount(`tty-${resourceName}`, namespace)
    await k8sApi.deleteNamespacedPod(`tty-${resourceName}`, namespace)
    if (!isAdmin) {
      for (const team of userTeams!)
        await rbacAuthorizationV1Api.deleteNamespacedRoleBinding(`tty-${team}-${resourceName}-rolebinding`, team)
    } else await rbacAuthorizationV1Api.deleteClusterRoleBinding('tty-admin-clusterrolebinding')
    await k8sApi.deleteNamespacedService(`tty-${resourceName}`, namespace)

    await customObjectsApi.deleteNamespacedCustomObject(
      apiGroupVS,
      apiVersion,
      namespace,
      pluralVS,
      `tty-${resourceName}`,
    )
  } catch (error) {
    debug(`Failed to delete resources for ${resourceName} in namespace ${namespace}.`)
  }
}

export async function getKubernetesVersion() {
  if (process.env.NODE_ENV === 'development') return 'x.x.x'

  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()

  const k8sApi = kc.makeApiClient(k8s.VersionApi)

  try {
    const response = await k8sApi.getCode()
    console.log('Kubernetes Server Version:', response.body.gitVersion)
    return response.body.gitVersion
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
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api)
  try {
    const res = await k8sApi.readNamespacedPodLog(
      podName,
      namespace,
      'po',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      3, // get the updated clients count from the last 3 lines
    )
    const lines = res.body.split('\n')
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

export async function getLastTektonMessage(sha: string): Promise<any> {
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()
  const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi)
  try {
    const res: any = await customObjectsApi.listNamespacedCustomObject(
      'tekton.dev',
      'v1',
      'otomi-pipelines',
      'pipelineruns',
    )
    const lastPipelineRun = res.body.items.find((item: any) => item.metadata.name.includes(sha))
    if (!lastPipelineRun) return {}
    const order = res.body.items.length
    const { name } = lastPipelineRun.metadata
    const { completionTime, conditions } = lastPipelineRun.status
    let status = 'pending'
    if (['True', 'False', 'Unknown'].includes(conditions[0].status)) status = conditions[0].reason.toLowerCase()
    return { order, name, completionTime, status }
  } catch (error) {
    debug(`Failed to get last Tekton message for ${sha}.`)
    return {}
  }
}

export async function getWorkloadStatus(workload: Workload): Promise<string> {
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(k8s.CustomObjectsApi)
  const name = `team-${workload.teamId}-${workload.name}`
  try {
    const res: any = await k8sApi.getNamespacedCustomObject('argoproj.io', 'v1alpha1', 'argocd', 'applications', name)
    const { status } = res.body.status.sync
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
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(k8s.CustomObjectsApi)
  try {
    const res: any = await k8sApi.listNamespacedCustomObject(
      group,
      'v1beta1',
      namespace,
      plural,
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelector,
    )
    return res
  } catch (error) {
    return 'NotFound'
  }
}

export async function getBuildStatus(build: Build): Promise<string> {
  const labelSelector = `tekton.dev/pipeline=${build.mode?.type}-build-${build.name}`
  const resPipelineruns = await listNamespacedCustomObject(
    'tekton.dev',
    `team-${build.teamId}`,
    'pipelineruns',
    labelSelector,
  )
  try {
    const [pipelineRun] = resPipelineruns.body.items
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
        `team-${build.teamId}`,
        'eventlisteners',
        labelSelector,
      )
      const [eventlistener] = resEventlisteners.body.items
      if (eventlistener) {
        const { conditions } = eventlistener.status
        if (conditions && conditions.length > 0) return 'Pending'
        else {
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
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(k8s.CustomObjectsApi)
  try {
    const res: any = await k8sApi.getNamespacedCustomObject(
      'networking.istio.io',
      'v1beta1',
      namespace,
      'gateways',
      name,
    )
    const { hosts } = res.body.spec.servers[0]
    return hosts
  } catch (error) {
    return 'NotFound'
  }
}

async function checkHostStatus(namespace: string, name: string, host: string) {
  const hosts = await getNamespacedCustomObject(namespace, `${name}`)
  return hosts.includes(host) ? 'Succeeded' : 'Unknown'
}

export async function getServiceStatus(service: Service, domainSuffix: string): Promise<string> {
  const isKsvc = service?.ksvc?.predeployed
  const namespace = `team-${service.teamId}`
  const name = `team-${service.teamId}-public`
  const host = `team-${service.teamId}/${service.name}-${service.teamId}.${domainSuffix}`

  if (isKsvc) {
    const res = await listNamespacedCustomObject('networking.istio.io', namespace, 'virtualservices', undefined)
    const virtualservices = res?.body?.items?.map((item) => item.metadata.name) || []
    if (virtualservices.includes(`${service.name}-ingress`)) return 'Succeeded'
    else return 'NotFound'
  }

  const tlstermStatus = await checkHostStatus(namespace, `${name}-tlsterm`, host)
  if (tlstermStatus === 'Succeeded') return 'Succeeded'

  const tlspassStatus = await checkHostStatus(namespace, `${name}-tlspass`, host)
  return tlspassStatus
}

export async function getSecretValues(name: string, namespace: string): Promise<any> {
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api)
  try {
    const res = await k8sApi.readNamespacedSecret(name, namespace)
    const { data } = res.body
    const decodedData = {}
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key))
        decodedData[key] = Buffer.from(data[key], 'base64').toString('utf-8')
    }
    return decodedData
  } catch (error) {
    if (process.env.NODE_ENV !== 'development') debug(`Failed to get secret values for ${name} in ${namespace}.`)
  }
}

export async function getSealedSecretSyncedStatus(name: string, namespace: string): Promise<string> {
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(k8s.CustomObjectsApi)

  try {
    const res: any = await k8sApi.getNamespacedCustomObject('bitnami.com', 'v1alpha1', namespace, 'sealedsecrets', name)
    const { conditions } = res.body.status
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
    if (process.env.NODE_ENV !== 'development')
      debug(`Failed to get SealedSecret synced status for ${name} in ${namespace}.`)

    return 'NotFound'
  }
}

export async function getSealedSecretStatus(sealedsecret: SealedSecret): Promise<string> {
  const { name } = sealedsecret
  const namespace = sealedsecret?.namespace ?? `team-${sealedsecret.teamId}`
  const value = await getSecretValues(name, namespace)
  const syncedStatus = await getSealedSecretSyncedStatus(name, namespace)

  if (value && syncedStatus === 'Succeeded') return 'Succeeded'
  return syncedStatus
}

export async function getSealedSecretsCertificate(): Promise<string> {
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api)
  const namespace = 'sealed-secrets'
  const labelSelector = 'sealedsecrets.bitnami.com/sealed-secrets-key'

  try {
    const response = await k8sApi.listNamespacedSecret(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelector,
    )
    const { items } = response.body as any

    const newestItem = items.reduce((maxItem, currentItem) => {
      const maxTimestamp = new Date(maxItem.creationTimestamp as Date).getTime()
      const currentTimestamp = new Date(currentItem.creationTimestamp as Date).getTime()
      return currentTimestamp > maxTimestamp ? currentItem : maxItem
    }, items[0])

    if (newestItem.data['tls.crt']) return Buffer.from(newestItem.data['tls.crt'], 'base64').toString('utf-8')
    else {
      debug('Sealed secrets certificate not found!')
      return ''
    }
  } catch (error) {
    debug(`Failed to get SealedSecrets certificate.`)
    return ''
  }
}

export async function getSealedSecretsKeys(): Promise<any> {
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api)
  const namespace = 'sealed-secrets'
  const labelSelector = 'sealedsecrets.bitnami.com/sealed-secrets-key'

  try {
    const response = await k8sApi.listNamespacedSecret(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelector,
    )
    const { items } = response.body as any

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
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api)
  try {
    const res: any = await k8sApi.listNamespacedSecret(namespace)
    const secrets = res.body.items.map((item) => item.metadata.name)
    return secrets
  } catch (error) {
    debug(`Failed to get team secrets from k8s for ${namespace}.`)
  }
}
