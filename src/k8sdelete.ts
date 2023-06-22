import * as k8s from '@kubernetes/client-node'
// import * as fs from 'fs'
// import * as yaml from 'js-yaml'
// import { promisify } from 'util'

// export async function k8sdelete(
//   specPath: string,
//   resourceName: string,
//   namespace: string,
// ): Promise<k8s.KubernetesObject[]> {
export async function k8sdelete(specPath: string, resourceName: string, namespace: string) {
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
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api)
  const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi)
  const rbacAuthorizationV1Api = kc.makeApiClient(k8s.RbacAuthorizationV1Api)

  try {
    await k8sApi.deleteNamespacedServiceAccount(`tty-${resourceName}`, namespace)
    await k8sApi.deleteNamespacedPod(`tty-${resourceName}`, namespace)
    await rbacAuthorizationV1Api.deleteClusterRoleBinding('tty-admin-rolebinding')
    await k8sApi.deleteNamespacedService(`tty-${resourceName}`, namespace)
    // await rbacAuthorizationV1Api.deleteNamespacedRoleBinding(`tty-${resourceName}-rolebinding`, namespace)

    const apiVersion = 'networking.istio.io'
    const apiGroup = 'v1beta1'
    const plural = 'virtualservices'

    console.log('listNamespacedCustomObject virtualservices')
    customObjectsApi.listNamespacedCustomObject(apiGroup, apiVersion, namespace, plural).then(
      (response) => {
        console.log('response: ', response)
      },
      (err) => {
        console.log('error: ', err)
      },
    )

    console.log('deleteNamespacedCustomObject virtualservices')
    customObjectsApi
      .deleteNamespacedCustomObject(apiGroup, apiVersion, namespace, plural, `tty-${resourceName}`)
      .then(
        (response) => {
          console.log('response: ', response)
        },
        (err) => {
          console.log('error: ', err)
        },
      )
      .catch((err) => {
        console.log('catch error: ', err)
      })
  } catch (error) {
    console.log('k8sdelete error: ', error)
  }
}
