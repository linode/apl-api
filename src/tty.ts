import {
  ApiException,
  CoreV1Api,
  CustomObjectsApi,
  CustomObjectsApiCreateNamespacedCustomObjectRequest,
  KubeConfig,
  KubernetesObject,
  RbacAuthorizationV1Api,
} from '@kubernetes/client-node'
import Debug from 'debug'
import { SessionUser } from './otomi-models'

export default class CloudTty {
  private k8sApi: CoreV1Api
  private customObjectsApi: CustomObjectsApi
  private rbacAuthorizationApi: RbacAuthorizationV1Api
  private debug: Debug.Debugger

  constructor() {
    const kc = new KubeConfig()
    kc.loadFromDefault()
    this.k8sApi = kc.makeApiClient(CoreV1Api)
    this.customObjectsApi = kc.makeApiClient(CustomObjectsApi)
    this.rbacAuthorizationApi = kc.makeApiClient(RbacAuthorizationV1Api)
    this.debug = Debug('tty')
  }

  async createOrPatch<T>(
    createFunc: (params: T) => Promise<KubernetesObject>,
    patchFunc: (params: T) => Promise<KubernetesObject>,
    params: T,
  ): Promise<KubernetesObject> {
    try {
      return createFunc(params)
    } catch (error) {
      if (error instanceof ApiException && error.code === 409) {
        return patchFunc(params)
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

  async createAuthorizationPolicy(namespace: string, sub: string): Promise<KubernetesObject> {
    const body = {
      apiVersion: 'security.istio.io/v1',
      kind: 'AuthorizationPolicy',
      metadata: {
        name: `tty-${sub}`,
        namespace,
      },
      spec: {
        selector: {
          matchLabels: {
            app: 'tty-$SUB',
          },
        },
        action: 'ALLOW',
        rules: [
          {
            when: [
              {
                key: 'request.auth.claims[sub]',
                values: [sub],
              },
            ],
          },
        ],
      },
    }
    const params = {
      group: 'security.istio.io',
      version: 'v1',
      plural: 'authorizationpolicies',
      namespace,
      body,
    }
    return this.createOrPatch(
      this.customObjectsApi.createNamespacedCustomObject,
      this.customObjectsApi.patchNamespacedCustomObject,
      params,
    )
  }

  async deleteAuthorizationPolicy(namespace: string, sub: string): Promise<void> {
    await this.deleteIfExists(this.customObjectsApi.deleteNamespacedCustomObject, {
      group: 'security.istio.io',
      version: 'v1',
      namespace,
      plural: 'authorizationpolicies',
      name: `tty-${sub}`,
    })
  }

  async createServiceAccount(namespace: string, sub: string): Promise<KubernetesObject> {
    const body = {
      apiVersion: 'v1',
      kind: 'ServiceAccount',
      metadata: {
        name: `tty-${sub}`,
        namespace,
      },
    }
    return this.createOrPatch(this.k8sApi.createNamespacedServiceAccount, this.k8sApi.patchNamespacedServiceAccount, {
      namespace,
      body,
    })
  }

  async deleteServiceAccount(namespace: string, sub: string): Promise<void> {
    await this.deleteIfExists(this.k8sApi.deleteNamespacedServiceAccount, { namespace, name: `tty-${sub}` })
  }

  async createPod(namespace: string, sub: string): Promise<KubernetesObject> {
    const body = {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: {
        labels: {
          app: `tty-${sub}`,
          otomi: 'tty',
        },
        name: `tty-${sub}`,
        namespace,
      },
      spec: {
        serviceAccountName: `tty-${sub}`,
        securityContext: {
          runAsNonRoot: true,
          seccompProfile: {
            type: 'RuntimeDefault',
          },
          runAsUser: 1001,
          runAsGroup: 1001,
          fsGroup: 1001,
        },
        containers: [
          {
            image: 'linode/apl-tty:1.2.6',
            name: 'tty',
            resources: {
              requests: {
                memory: '128Mi',
                cpu: '250m',
              },
              limits: {
                memory: '256Mi',
                cpu: '500m',
              },
            },
            env: [
              {
                name: 'NAMESPACE',
                value: namespace,
              },
            ],
            securityContext: {
              allowPrivilegeEscalation: false,
              capabilities: {
                drop: ['ALL'],
              },
            },
          },
        ],
      },
    }
    return this.createOrPatch(this.k8sApi.createNamespacedPod, this.k8sApi.patchNamespacedPod, {
      namespace,
      body,
    })
  }

  async deletePod(namespace: string, sub: string): Promise<void> {
    await this.deleteIfExists(this.k8sApi.deleteNamespacedPod, { namespace, name: `tty-${sub}` })
  }

  async createRoleBinding(namespace: string, sub: string): Promise<KubernetesObject> {
    const body = {
      apiVersion: 'rbac.authorization.k8s.io/v1',
      kind: 'RoleBinding',
      metadata: {
        name: `tty-${sub}-rolebinding`,
        namespace,
      },
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'Role',
        name: 'tty-admin',
      },
      subjects: [
        {
          kind: 'ServiceAccount',
          name: `tty-${sub}`,
          namespace,
        },
      ],
    }
    return this.createOrPatch(
      this.rbacAuthorizationApi.createNamespacedRoleBinding,
      this.rbacAuthorizationApi.patchNamespacedRoleBinding,
      {
        namespace,
        body,
      },
    )
  }

  async deleteRoleBinding(namespace: string, sub: string): Promise<void> {
    await this.deleteIfExists(this.rbacAuthorizationApi.deleteNamespacedRoleBinding, {
      namespace,
      name: `tty-${sub}-rolebinding`,
    })
  }

  async createClusterRoleBinding(namespace: string, sub: string): Promise<KubernetesObject> {
    const body = {
      apiVersion: 'rbac.authorization.k8s.io/v1',
      kind: 'ClusterRoleBinding',
      metadata: {
        name: 'tty-admin-clusterrolebinding',
      },
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole',
        name: 'cluster-admin',
      },
      subjects: [
        {
          kind: 'ServiceAccount',
          name: `tty-${sub}`,
          namespace,
        },
      ],
    }
    return this.createOrPatch(
      this.rbacAuthorizationApi.createClusterRoleBinding,
      this.rbacAuthorizationApi.patchClusterRoleBinding,
      { body },
    )
  }

  async deleteClusterRoleBinding(): Promise<void> {
    await this.deleteIfExists(this.rbacAuthorizationApi.deleteClusterRoleBinding, {
      name: 'tty-admin-clusterrolebinding',
    })
  }

  async createService(namespace: string, sub: string): Promise<KubernetesObject> {
    const body = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        labels: {
          app: `tty-${sub}`,
        },
        name: `tty-${sub}`,
        namespace,
      },
      spec: {
        ports: [
          {
            name: 'http',
            port: 8080,
            protocol: 'TCP',
            targetPort: 8080,
          },
        ],
        selector: {
          app: `tty-${sub}`,
        },
        type: 'ClusterIP',
      },
    }
    return this.createOrPatch(this.k8sApi.createNamespacedService, this.k8sApi.patchNamespacedService, {
      namespace,
      body,
    })
  }

  async deleteService(namespace: string, sub: string): Promise<void> {
    await this.deleteIfExists(this.k8sApi.deleteNamespacedService, { namespace, name: `tty-${sub}` })
  }

  async createRoute(namespace: string, sub: string, domain: string): Promise<KubernetesObject> {
    const body = {
      apiVersion: 'gateway.networking.k8s.io/v1',
      kind: 'HTTPRoute',
      metadata: {
        name: `tty-${sub}`,
        namespace,
      },
      spec: {
        hostnames: [`tty.${domain}`],
        parentRefs: [
          {
            group: 'gateway.networking.k8s.io',
            kind: 'Gateway',
            name: 'platform',
            namespace: 'istio-system',
            sectionName: 'https',
          },
        ],
        rules: [
          {
            backendRefs: [
              {
                group: '',
                kind: 'Service',
                name: `tty-${sub}`,
                port: 8080,
              },
            ],
            matches: [
              {
                path: {
                  type: 'PathPrefix',
                  value: `/${sub}`,
                },
              },
            ],
            filters: [
              {
                type: 'URLRewrite',
                urlRewrite: {
                  path: {
                    type: 'ReplaceFullPath',
                    replaceFullPath: '/',
                  },
                },
              },
            ],
          },
        ],
      },
    }
    return this.createOrPatch(
      this.customObjectsApi.createNamespacedCustomObject,
      this.customObjectsApi.patchNamespacedCustomObject,
      {
        group: 'gateway.networking.k8s.io',
        version: 'v1',
        plural: 'httproutes',
        namespace,
        body,
      },
    )
  }

  async deleteRoute(namespace: string, sub: string): Promise<void> {
    await this.deleteIfExists(this.customObjectsApi.deleteNamespacedCustomObject, {
      group: 'gateway.networking.k8s.io',
      version: 'v1',
      namespace,
      plural: 'httproutes',
      name: `tty-${sub}`,
    })
  }

  async createTty(teamId: string, sessionUser: SessionUser, domain: string): Promise<void> {
    const { sub, isPlatformAdmin, teams } = sessionUser
    const namespace = isPlatformAdmin ? 'team-admin' : `team-${teamId}`
    await this.createAuthorizationPolicy(namespace, sub!)
    await this.createServiceAccount(namespace, sub!)
    await this.createPod(namespace, sub!)
    if (isPlatformAdmin) {
      await this.createClusterRoleBinding(namespace, sub!)
    } else if (teams) {
      for (const team of teams) {
        await this.createRoleBinding(`team-${team}`, sub!)
      }
    }
    await this.createService(namespace, sub!)
    await this.createRoute(namespace, sub!, domain)
  }

  async deleteTty(teamId: string, sessionUser: SessionUser): Promise<void> {
    const { sub, isPlatformAdmin, teams } = sessionUser
    const namespace = isPlatformAdmin ? 'team-admin' : `team-${teamId}`
    await this.deleteAuthorizationPolicy(namespace, sub!)
    await this.deleteServiceAccount(namespace, sub!)
    await this.deletePod(namespace, sub!)
    if (isPlatformAdmin) {
      await this.deleteClusterRoleBinding()
    } else if (teams) {
      for (const team of teams) {
        await this.deleteRoleBinding(`team-${team}`, sub!)
      }
    }
    await this.deleteService(namespace, sub!)
    await this.deleteRoute(namespace, sub!)
  }
}
