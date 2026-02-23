import { X509Certificate } from 'crypto'
import { isEmpty } from 'lodash'
import { SealedSecretManifestRequest, SealedSecretManifestResponse } from 'src/otomi-models'
import { ValidationError } from '../error'
import { getSealedSecretsCertificate } from '../k8s_operations'

export function sealedSecretManifest(teamId: string, data: SealedSecretManifestRequest): SealedSecretManifestResponse {
  const { annotations, labels, finalizers } = data.spec?.template?.metadata || {}
  const namespace = `team-${teamId}`

  return {
    apiVersion: 'bitnami.com/v1alpha1',
    kind: 'SealedSecret',
    metadata: {
      name: data.metadata.name,
      annotations: {
        'sealedsecrets.bitnami.com/namespace-wide': 'true',
      },
      labels: {
        'apl.io/teamId': teamId,
      },
      namespace,
    },
    spec: {
      encryptedData: data.spec.encryptedData || {},
      template: {
        type: data.spec.template?.type || 'kubernetes.io/opaque',
        immutable: data.spec.template?.immutable || false,
        metadata: {
          name: data.metadata.name,
          namespace,
          ...(!isEmpty(annotations) && { annotations }),
          ...(!isEmpty(labels) && { labels }),
          ...(!isEmpty(finalizers) && { finalizers }),
        },
      },
    },
    status: {},
  }
}

export function ensureSealedSecretMetadata(
  manifest: SealedSecretManifestResponse,
  teamId: string,
): SealedSecretManifestResponse {
  const hasCorrectLabel = manifest.metadata.labels?.['apl.io/teamId'] === teamId
  const hasCorrectAnnotation = manifest.metadata.annotations?.['sealedsecrets.bitnami.com/namespace-wide'] === 'true'

  if (hasCorrectLabel && hasCorrectAnnotation) {
    return manifest
  }

  return {
    ...manifest,
    metadata: {
      ...manifest.metadata,
      annotations: {
        ...manifest.metadata.annotations,
        'sealedsecrets.bitnami.com/namespace-wide': 'true',
      },
      labels: {
        ...manifest.metadata.labels,
        'apl.io/teamId': teamId,
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
    if (process.env.NODE_ENV?.toString() === 'development') return ''
    else {
      const certificate = await getSealedSecretsCertificate()
      if (!certificate) {
        throw new ValidationError('SealedSecrets certificate not found')
      }
      return getPEM(certificate)
    }
  } catch (error) {
    console.error('Error fetching SealedSecrets certificate:', error)
    throw new ValidationError('SealedSecrets certificate not found')
  }
}
