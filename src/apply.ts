import * as k8s from '@kubernetes/client-node'
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { promisify } from 'util'

/**
 * Replicate the functionality of `kubectl apply`.  That is, create the resources defined in the `specFile` if they do
 * not exist, patch them if they do exist.
 *
 * @param specPath File system path to a YAML Kubernetes spec.
 * @return Array of resources created
 */
export async function apply(specPath: string): Promise<k8s.KubernetesObject[]> {
  console.log('Spec_Path_:', specPath)
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

  const k8sApi = kc.makeApiClient(k8s.CoreV1Api)

  if (created) {
    console.log('created', created)
    k8sApi
      .listNamespacedPod('team-admin')
      .then((res) => {
        const pods = res.body.items
        console.log('pods', pods)

        // Find the specific pod by name
        const pod = pods.find((item: any) => item.metadata.name === 'team-admin') as any

        if (pod) console.log(`Pod ${'team-admin'} status: ${pod.status.phase}`)
        else console.log(`Pod ${'team-admin'} not found.`)
      })
      .catch((err) => {
        console.error('Error:', err)
      })
  }
  return created
}
