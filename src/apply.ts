import * as k8s from '@kubernetes/client-node'
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { promisify } from 'util'

export async function watchPodUntilRunning(namespace: string, podName: string) {
  let isRunning = false

  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()

  const k8sApi = kc.makeApiClient(k8s.CoreV1Api)

  while (!isRunning) {
    const res = await k8sApi.readNamespacedPodStatus(podName, namespace)
    isRunning = res.body.status?.phase === 'Running'

    if (!isRunning) {
      console.log(`Pod ${podName} is not running. Checking again in 5 seconds...`)
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }

  console.log(`Pod ${podName} is now running!`)
  return true
}

/**
 * Replicate the functionality of `kubectl apply`.  That is, create the resources defined in the `specFile` if they do
 * not exist, patch them if they do exist.
 *
 * @param specPath File system path to a YAML Kubernetes spec.
 * @return Array of resources created
 */
export async function apply(specPath: string): Promise<k8s.KubernetesObject[]> {
  console.log('1=====================')
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()
  const client = k8s.KubernetesObjectApi.makeApiClient(kc) as any
  console.log('2=====================')
  const fsReadFileP = promisify(fs.readFile)
  const specString = await fsReadFileP(specPath, 'utf8')
  const specs: any = yaml.loadAll(specString)
  const validSpecs = specs.filter((s) => s && s.kind && s.metadata)
  console.log('3=====================')
  const created: k8s.KubernetesObject[] = []
  for (const spec of validSpecs) {
    console.log('4=====================')
    // this is to convince the old version of TypeScript that metadata exists even though we already filtered specs
    // without metadata out
    spec.metadata = spec.metadata || {}
    spec.metadata.annotations = spec.metadata.annotations || {}
    console.log('5=====================')
    delete spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration']
    spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'] = JSON.stringify(spec)
    console.log('6=====================')
    try {
      console.log('7=====================')
      // try to get the resource, if it does not exist an error will be thrown and we will end up in the catch
      // block.
      await client.read(spec)
      console.log('8=====================')
      // we got the resource, so it exists, so patch it
      //
      // Note that this could fail if the spec refers to a custom resource. For custom resources you may need
      // to specify a different patch merge strategy in the content-type header.
      //
      // See: https://github.com/kubernetes/kubernetes/issues/97423
      const response = await client.patch(spec)
      console.log('9=====================')
      created.push(response.body)
    } catch (e) {
      console.log('10=====================')
      // we did not get the resource, so it does not exist, so create it
      const response = await client.create(spec)
      created.push(response.body)
    }
  }

  // try {
  //   console.log('watchPodUntilRunning STARTED!')
  //   await watchPodUntilRunning(ttyPodName, 'team-admin')
  // } catch (error) {
  //   console.log('watchPodUntilRunning error:', error)
  // }

  console.log('11=====================')
  return created
}
