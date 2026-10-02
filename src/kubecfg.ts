import KubeApi from './kubeapi'
import { ValidationError } from './error'

export interface KubeCfgConfig {
  clusterName: string
  apiServer: string
  expirationSeconds: number
}

export default class KubeCfgGenerator extends KubeApi {
  private config: KubeCfgConfig

  constructor(kubecfgConfig: KubeCfgConfig) {
    super('kubecfg')
    this.config = kubecfgConfig
  }

  async createToken(namespace: string, userName: string): Promise<string> {
    const res = await this.coreApi.createNamespacedServiceAccountToken({
      body: {
        spec: {
          audiences: [userName],
          expirationSeconds: this.config.expirationSeconds,
        },
      },
      name: 'exported-kubeconfig',
      namespace,
    })
    if (!res.status?.token) {
      throw new ValidationError('Failed to create service account token')
    }
    return res.status?.token
  }

  async getKubeCfg(namespace: string, sub: string): Promise<Record<string, any>> {
    const token = await this.createToken(namespace, sub!)
    const apiName = `apl-${this.config.clusterName}`
    const userName = sub
    const contextName = `${namespace}-${sub}`
    const cluster = {
      name: apiName,
      server: this.config.apiServer,
      skipTLSVerify: true,
    }
    const user = {
      name: userName,
      user: { token },
    }
    const context = {
      name: contextName,
      namespace,
      user: userName,
      cluster: apiName,
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
