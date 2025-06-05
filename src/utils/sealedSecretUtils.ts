import { X509Certificate } from 'crypto'
import { isEmpty } from 'lodash'
import { AplSecretResponse } from 'src/otomi-models'
import { ValidationError } from '../error'
import { getSealedSecretsCertificate } from '../k8s_operations'

export interface SealedSecretManifestType {
  apiVersion: string
  kind: string
  metadata: {
    name: string
    namespace: string
    annotations?: Record<string, string>
    finalizers?: string[]
    labels?: Record<string, string>
  }
  spec: {
    encryptedData: Record<string, string>
    template: {
      type:
        | 'kubernetes.io/opaque'
        | 'kubernetes.io/service-account-token'
        | 'kubernetes.io/dockercfg'
        | 'kubernetes.io/dockerconfigjson'
        | 'kubernetes.io/basic-auth'
        | 'kubernetes.io/ssh-auth'
        | 'kubernetes.io/tls'
      immutable: boolean
      metadata: {
        name: string
        namespace: string
        annotations?: Record<string, string>
        finalizers?: string[]
        labels?: Record<string, string>
      }
    }
  }
}

export function sealedSecretManifest(data: AplSecretResponse): SealedSecretManifestType {
  const { annotations, labels, finalizers } = data.spec.metadata || {}
  const namespace = data.spec.namespace!
  return {
    apiVersion: 'bitnami.com/v1alpha1',
    kind: 'SealedSecret',
    metadata: {
      ...data.metadata,
      annotations: {
        'sealedsecrets.bitnami.com/namespace-wide': 'true',
      },
      namespace,
    },
    spec: {
      encryptedData: data.spec.encryptedData || {},
      template: {
        type: data.spec.type || 'kubernetes.io/opaque',
        immutable: data.spec.immutable || false,
        metadata: {
          name: data.metadata.name,
          namespace,
          ...(!isEmpty(annotations) && { annotations }),
          ...(!isEmpty(labels) && { labels }),
          ...(!isEmpty(finalizers) && { finalizers }),
        },
      },
    },
  }
}

function getPEM(certificate): string {
  const x509 = new X509Certificate(certificate)
  const value = x509.publicKey
  const exported = value.export({
    format: 'pem',
    type: 'spki',
  })
  return typeof exported === 'string' ? exported : exported.toString('utf-8')
}

export async function getSealedSecretsPEM(): Promise<string> {
  try {
    const certificate = await getSealedSecretsCertificate()
    if (!certificate) {
      if (process.env.NODE_ENV === 'development') return ''
      throw new ValidationError('SealedSecrets certificate not found')
    }
    return getPEM(certificate)
  } catch (error) {
    console.error('Error fetching SealedSecrets certificate:', error)
    if (process.env.NODE_ENV === 'development') return ''
    throw new ValidationError('SealedSecrets certificate not found')
  }
}
