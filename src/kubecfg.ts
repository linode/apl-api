import KubeApi from './kubeapi'
import { ValidationError } from './error'

export interface KubeCfgConfig {
  clusterName: string
  apiServer: string
  expirationSeconds: number
  serviceAccount: string
}

export default class KubeCfgGenerator extends KubeApi {
  private config: KubeCfgConfig

  constructor(kubecfgConfig: KubeCfgConfig) {
    super('kubecfg')
    this.config = kubecfgConfig
  }

  async createToken(namespace: string): Promise<string> {
    const res = await this.coreApi.createNamespacedServiceAccountToken({
      body: {
        spec: {
          audiences: ['https://kubernetes.default.svc'],
          expirationSeconds: this.config.expirationSeconds,
        },
      },
      name: this.config.serviceAccount,
      namespace,
    })
    if (!res.status?.token) {
      throw new ValidationError('Failed to create service account token')
    }
    return res.status?.token
  }

  async getCaCert(): Promise<string | undefined> {
    try {
      const res = await this.coreApi.readNamespacedConfigMap({ name: 'kube-root-ca.crt', namespace: 'kube-system' })
      const caCert = res.data?.['ca.crt']
      if (!caCert) {
        this.debug('Unable to derive CA certificate from kube-root-ca.crt secret')
        return undefined
      }
      return caCert
    } catch {
      this.debug('Unable to read CA certificate from kube-root-ca.crt secret')
      return undefined
    }
  }

  async getKubeCfg(namespace: string, sub: string): Promise<Record<string, any>> {
    const token = await this.createToken(namespace)
    const apiName = `apl-${this.config.clusterName}`
    const userName = sub
    const contextName = `${namespace}-${sub}`
    const cluster = {
      name: apiName,
      cluster: {
        server: this.config.apiServer,
      },
    }
    const caCert = await this.getCaCert()
    if (caCert) {
      cluster.cluster['certificate-authority-data'] = Buffer.from(caCert).toString('base64')
    } else {
      cluster.cluster['insecure-skip-tls-verify'] = true
    }
    const user = {
      name: userName,
      user: { token },
    }
    const context = {
      name: contextName,
      context: {
        namespace,
        user: userName,
        cluster: apiName,
      },
    }
    return {
      apiVersion: 'v1',
      kind: 'Config',
      clusters: [cluster],
      users: [user],
      contexts: [context],
      'current-context': contextName,
    }
  }
}
