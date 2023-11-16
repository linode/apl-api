import * as k8s from '@kubernetes/client-node'
import Debug from 'debug'
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { promisify } from 'util'
import { Cloudtty } from './otomi-models'

const debug = Debug('otomi:api:cloudtty')

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
    } catch (error) {
      debug('watchPodUntilRunning error:', error)
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

export async function checkPodExists(namespace: string, podName: string) {
  let isRunning = false
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api)

  try {
    const res = await k8sApi.readNamespacedPodStatus(podName, namespace)
    isRunning = res.body.status?.phase === 'Running'
  } catch (error) {
    debug('checkPodExist error:', error)
  }

  return isRunning
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
        await rbacAuthorizationV1Api.deleteNamespacedRoleBinding(`tty-${team}-rolebinding`, team)
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
    debug('k8sdelete error:', error)
  }
}

// Get the amount of nodes from the cluster
export async function getNodes(envType: string) {
  const metricsDebug = Debug('otomi:api:k8sOperations')
  if (!envType) {
    metricsDebug('k8sGetNodes: Local development! Returning 0 nodes')
    return 0
  }
  try {
    const kc = new k8s.KubeConfig()
    kc.loadFromDefault()
    const k8sApi = kc.makeApiClient(k8s.CoreV1Api)
    const nodesResponse = await k8sApi.listNode()
    const numberOfNodes = nodesResponse.body.items.length
    return numberOfNodes
  } catch (error) {
    metricsDebug('k8sGetNodes error:', error)
    metricsDebug('k8sGetNodes error: Error encountered, returning -1 nodes')
    return -1
  }
}

export async function getKubernetesVersion(envType: string) {
  if (envType === 'dev') return 'x.x.x'

  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()

  const k8sApi = kc.makeApiClient(k8s.VersionApi)

  try {
    const response = await k8sApi.getCode()
    console.log('Kubernetes Server Version:', response.body.gitVersion)
    return response.body.gitVersion
  } catch (err) {
    console.error('Error:', err)
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
    debug('getCloudttyActiveTime error:', error)
  }
}

export async function getLastPipelineName(sha: string): Promise<any | undefined> {
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
    if (!lastPipelineRun) return undefined
    const order = res.body.items.length
    const { name } = lastPipelineRun.metadata
    const { completionTime, conditions } = lastPipelineRun.status
    let status
    switch (conditions[0].status) {
      case 'True':
        status = 'success'
        break
      case 'False':
        status = 'failed'
        break
      case 'Unknown':
        status = 'pending'
        break
      default:
        status = 'pending'
        break
    }
    return { order, name, completionTime, status }
  } catch (error) {
    debug('getLastPipelineName error:', error)
  }
}

// first: listNamespacedCustomObject

// then: getNamespacedCustomObject

// group: tekton.dev
// version: v1
// namespace: otomi-pipelines
// plural: pipelineruns
// name: otomi-pipeline-run
