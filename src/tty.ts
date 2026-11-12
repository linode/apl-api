import { KubernetesObject } from '@kubernetes/client-node'
import { createHash } from 'crypto'
import KubeApi from './kubeapi'
import { SessionUser } from './otomi-models'

export interface TtyConfig {
  imageRepository: string
  imageTag: string
}

// The OIDC `sub` can't be used in resource names: Dex subs are base64 (uppercase, `_`) and can exceed 63 chars.
// Hashing gives a stable, lowercase hex id that is a valid Kubernetes name for any identity provider.
export function ttyId(sub: string): string {
  return createHash('sha256').update(sub).digest('hex').slice(0, 16)
}

export default class CloudTty extends KubeApi {
  private config: TtyConfig

  constructor(ttyConfig: TtyConfig) {
    super('tty')
    this.config = ttyConfig
  }

  async createAuthorizationPolicy(namespace: string, id: string, sub: string): Promise<KubernetesObject> {
    const body = {
      apiVersion: 'security.istio.io/v1',
      kind: 'AuthorizationPolicy',
      metadata: {
        name: `tty-${id}`,
        namespace,
      },
      spec: {
        selector: {
          matchLabels: {
            app: `tty-${id}`,
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

  async deleteAuthorizationPolicy(namespace: string, id: string): Promise<void> {
    await this.deleteIfExists(this.customObjectsApi.deleteNamespacedCustomObject, {
      group: 'security.istio.io',
      version: 'v1',
      namespace,
      plural: 'authorizationpolicies',
      name: `tty-${id}`,
    })
  }

  async createServiceAccount(namespace: string, id: string): Promise<KubernetesObject> {
    const body = {
      apiVersion: 'v1',
      kind: 'ServiceAccount',
      metadata: {
        name: `tty-${id}`,
        namespace,
      },
    }
    return this.createOrPatch(this.coreApi.createNamespacedServiceAccount, this.coreApi.patchNamespacedServiceAccount, {
      namespace,
      body,
    })
  }

  async deleteServiceAccount(namespace: string, id: string): Promise<void> {
    await this.deleteIfExists(this.coreApi.deleteNamespacedServiceAccount, { namespace, name: `tty-${id}` })
  }

  async createPod(namespace: string, id: string): Promise<KubernetesObject> {
    const image = `${this.config.imageRepository}:${this.config.imageTag}`
    const body = {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: {
        labels: {
          app: `tty-${id}`,
          otomi: 'tty',
        },
        name: `tty-${id}`,
        namespace,
      },
      spec: {
        serviceAccountName: `tty-${id}`,
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
            image,
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
    return this.createOrPatch(this.coreApi.createNamespacedPod, this.coreApi.patchNamespacedPod, {
      namespace,
      body,
    })
  }

  async deletePod(namespace: string, id: string): Promise<void> {
    await this.deleteIfExists(this.coreApi.deleteNamespacedPod, { namespace, name: `tty-${id}` })
  }

  async createRoleBinding(accountNamespace: string, targetNamespace: string, id: string): Promise<KubernetesObject> {
    const body = {
      apiVersion: 'rbac.authorization.k8s.io/v1',
      kind: 'RoleBinding',
      metadata: {
        name: `tty-${id}-rolebinding`,
        namespace: targetNamespace,
      },
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'ClusterRole',
        name: 'admin',
      },
      subjects: [
        {
          kind: 'ServiceAccount',
          name: `tty-${id}`,
          namespace: accountNamespace,
        },
      ],
    }
    return this.createOrPatch(
      this.rbacAuthorizationApi.createNamespacedRoleBinding,
      this.rbacAuthorizationApi.patchNamespacedRoleBinding,
      {
        namespace: targetNamespace,
        body,
      },
    )
  }

  async deleteRoleBinding(targetNamespace: string, id: string): Promise<void> {
    await this.deleteIfExists(this.rbacAuthorizationApi.deleteNamespacedRoleBinding, {
      namespace: targetNamespace,
      name: `tty-${id}-rolebinding`,
    })
  }

  async createClusterRoleBinding(namespace: string, id: string): Promise<KubernetesObject> {
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
          name: `tty-${id}`,
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

  async createService(namespace: string, id: string): Promise<KubernetesObject> {
    const body = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        labels: {
          app: `tty-${id}`,
        },
        name: `tty-${id}`,
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
          app: `tty-${id}`,
        },
        type: 'ClusterIP',
      },
    }
    return this.createOrPatch(this.coreApi.createNamespacedService, this.coreApi.patchNamespacedService, {
      namespace,
      body,
    })
  }

  async deleteService(namespace: string, id: string): Promise<void> {
    await this.deleteIfExists(this.coreApi.deleteNamespacedService, { namespace, name: `tty-${id}` })
  }

  async createRoute(namespace: string, id: string, domain: string): Promise<KubernetesObject> {
    const body = {
      apiVersion: 'gateway.networking.k8s.io/v1',
      kind: 'HTTPRoute',
      metadata: {
        name: `tty-${id}`,
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
                name: `tty-${id}`,
                port: 8080,
              },
            ],
            matches: [
              {
                path: {
                  type: 'PathPrefix',
                  value: `/${id}`,
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

  async deleteRoute(namespace: string, id: string): Promise<void> {
    await this.deleteIfExists(this.customObjectsApi.deleteNamespacedCustomObject, {
      group: 'gateway.networking.k8s.io',
      version: 'v1',
      namespace,
      plural: 'httproutes',
      name: `tty-${id}`,
    })
  }

  async createTty(teamId: string, sessionUser: SessionUser, domain: string): Promise<void> {
    const { sub, isPlatformAdmin, teams } = sessionUser
    const id = ttyId(sub!)
    const namespace = isPlatformAdmin ? 'team-admin' : `team-${teamId}`
    await this.createAuthorizationPolicy(namespace, id, sub!)
    await this.createServiceAccount(namespace, id)
    await this.createPod(namespace, id)
    if (isPlatformAdmin) {
      await this.createClusterRoleBinding(namespace, id)
    } else if (teams) {
      for (const team of teams) {
        await this.createRoleBinding(namespace, `team-${team}`, id)
      }
    }
    await this.createService(namespace, id)
    await this.createRoute(namespace, id, domain)
  }

  async deleteTty(teamId: string, sessionUser: SessionUser): Promise<void> {
    const { sub, isPlatformAdmin, teams } = sessionUser
    const id = ttyId(sub!)
    const namespace = isPlatformAdmin ? 'team-admin' : `team-${teamId}`
    await this.deleteAuthorizationPolicy(namespace, id)
    await this.deleteServiceAccount(namespace, id)
    await this.deletePod(namespace, id)
    if (isPlatformAdmin) {
      await this.deleteClusterRoleBinding()
    } else if (teams) {
      for (const team of teams) {
        await this.deleteRoleBinding(`team-${team}`, id)
      }
    }
    await this.deleteService(namespace, id)
    await this.deleteRoute(namespace, id)
  }
}
