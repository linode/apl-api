import * as k8s from '@kubernetes/client-node'
import { Cloudtty } from './otomi-models'

export async function k8sdelete({ emailNoSymbols, isAdmin, userTeams }: Cloudtty) {
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api)
  const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi)
  const rbacAuthorizationV1Api = kc.makeApiClient(k8s.RbacAuthorizationV1Api)

  const resourceName = emailNoSymbols
  const namespace = 'team-admin'

  try {
    await k8sApi.deleteNamespacedServiceAccount(`tty-${resourceName}`, namespace)
    await k8sApi.deleteNamespacedPod(`tty-${resourceName}`, namespace)

    if (!isAdmin) {
      for (const team of userTeams!)
        await rbacAuthorizationV1Api.deleteNamespacedRoleBinding(`tty-${team}-rolebinding`, team)
    } else await rbacAuthorizationV1Api.deleteClusterRoleBinding('tty-admin-rolebinding')

    await k8sApi.deleteNamespacedService(`tty-${resourceName}`, namespace)
    const apiGroup = 'networking.istio.io'
    const apiVersion = 'v1beta1'
    const plural = 'virtualservices'
    await customObjectsApi.deleteNamespacedCustomObject(apiGroup, apiVersion, namespace, plural, `tty-${resourceName}`)
  } catch (error) {
    console.log('k8sdelete error: ', error)
  }
}
