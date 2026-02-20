import { X509Certificate } from 'crypto'
import Debug from 'debug'
import { isEmpty } from 'lodash'
import { SealedSecretManifestRequest, SealedSecretManifestResponse } from 'src/otomi-models'
import { ValidationError } from '../error'
import { getSealedSecretsCertificate } from '../k8s_operations'

const debug = Debug('otomi:sealedSecretUtils')

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

// Kubeseal ciphertext is a long base64 string (typically 300+ chars).
// Plain text values are shorter and likely not valid base64.
function isEncryptedValue(value: string): boolean {
  if (value.length < 200) return false
  return /^[A-Za-z0-9+/=]+$/.test(value)
}

export async function encryptSecretValue(pem: string, namespace: string, value: string): Promise<string> {
  const { encryptSecretItem } = await import('@linode/kubeseal-encrypt')
  return encryptSecretItem(pem, namespace, value)
}

/**
 * Ensures all encryptedData values are encrypted.
 * If any values appear to be plain text, encrypts them server-side as a fallback.
 */
export async function ensureEncryptedData(
  encryptedData: Record<string, string>,
  teamId: string,
): Promise<Record<string, string>> {
  const namespace = `team-${teamId}`
  const plainTextKeys = Object.entries(encryptedData).filter(([, value]) => !isEncryptedValue(value))

  if (plainTextKeys.length === 0) return encryptedData

  debug(`Encrypting ${plainTextKeys.length} plain text value(s) server-side for namespace ${namespace}`)
  const pem = await getSealedSecretsPEM()
  if (!pem) throw new ValidationError('Cannot encrypt: SealedSecrets PEM not available')

  const result = { ...encryptedData }
  for (const [key, value] of plainTextKeys) {
    result[key] = await encryptSecretValue(pem, namespace, value)
  }
  return result
}
