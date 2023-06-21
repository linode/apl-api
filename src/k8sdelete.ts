import * as k8s from '@kubernetes/client-node'
// import * as fs from 'fs'
// import * as yaml from 'js-yaml'
// import { promisify } from 'util'

// export async function k8sdelete(
//   specPath: string,
//   resourceName: string,
//   namespace: string,
// ): Promise<k8s.KubernetesObject[]> {
export function k8sdelete(specPath: string, resourceName: string, namespace: string) {
  // const kc = new k8s.KubeConfig()
  // kc.loadFromDefault()

  // const client = k8s.KubernetesObjectApi.makeApiClient(kc) as any
  // const fsReadFileP = promisify(fs.readFile)
  // const specString = await fsReadFileP(specPath, 'utf8')
  // const specs: any = yaml.loadAll(specString)
  // const validSpecs = specs.filter((s) => s && s.kind && s.metadata)
  // const deleted: k8s.KubernetesObject[] = []

  // for (const spec of validSpecs) {
  //   spec.metadata = spec.metadata || {}
  //   spec.metadata.annotations = spec.metadata.annotations || {}
  //   delete spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration']
  //   spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'] = JSON.stringify(spec)
  //   try {
  //     await client.read(spec)
  //     const response = await client.delete(spec)
  //     deleted.push(response.body)
  //   } catch (e) {
  //     console.log('delete error:', e)
  //   }
  // }

  // return deleted

  // Delete the pod

  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()

  const client = k8s.KubernetesObjectApi.makeApiClient(kc) as any
  client
    .deleteNamespacedPod(resourceName, namespace)
    .then((response) => {
      console.log('Pod deleted successfully:', response.body)
    })
    .catch((err) => {
      console.error('Error deleting pod:', err.response.body)
    })
}
