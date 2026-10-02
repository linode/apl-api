import {
  ApiException,
  ConfigurationOptions,
  CoreV1Api,
  CustomObjectsApi,
  KubeConfig,
  KubernetesObject,
  PatchStrategy,
  RbacAuthorizationV1Api,
  setHeaderOptions,
} from '@kubernetes/client-node'
import Debug from 'debug'

export default class KubeApi {
  protected k8sApi: CoreV1Api
  protected customObjectsApi: CustomObjectsApi
  protected rbacAuthorizationApi: RbacAuthorizationV1Api
  private readonly debug: Debug.Debugger

  constructor(debugNamespace = 'kubeapi') {
    const kc = new KubeConfig()
    kc.loadFromDefault()
    this.k8sApi = kc.makeApiClient(CoreV1Api)
    this.customObjectsApi = kc.makeApiClient(CustomObjectsApi)
    this.rbacAuthorizationApi = kc.makeApiClient(RbacAuthorizationV1Api)

    // Keep client methods bound when they are passed as callbacks.
    for (const client of [this.k8sApi, this.customObjectsApi, this.rbacAuthorizationApi]) {
      const proto = Object.getPrototypeOf(client)
      Object.getOwnPropertyNames(proto)
        .filter((m) => typeof client[m] === 'function')
        .forEach((m) => {
          client[m] = client[m].bind(client)
        })
    }

    this.debug = Debug(debugNamespace)
  }

  async createOrPatch<T extends { body: KubernetesObject }>(
    createFunc: (params: T) => Promise<KubernetesObject>,
    patchFunc: (params: T, options?: ConfigurationOptions) => Promise<KubernetesObject>,
    params: T,
  ): Promise<KubernetesObject> {
    try {
      return await createFunc(params)
    } catch (error) {
      if (error instanceof ApiException && error.code === 409) {
        const { name } = params.body.metadata!
        return await patchFunc(
          { name, ...params, fieldManager: 'apl-api', force: true },
          setHeaderOptions('Content-Type', PatchStrategy.ServerSideApply),
        )
      } else {
        throw error
      }
    }
  }

  async deleteIfExists<T>(func: (params: T) => Promise<any>, params: T): Promise<void> {
    try {
      await func(params)
    } catch (error) {
      if (error instanceof ApiException && error.code === 404) {
        return
      } else {
        this.debug(error)
      }
    }
  }
}
