import { encryptSecretItem } from '@linode/kubeseal-encrypt'
import { X509Certificate } from 'crypto'
import Debug from 'debug'
import { get, isEmpty, unset } from 'lodash'
import { APL_USERS_NAMESPACE } from 'src/constants'
import { SealedSecretManifestRequest, SealedSecretManifestResponse, User } from 'src/otomi-models'
import { cleanEnv } from 'src/validators'
import { stringify as stringifyYaml } from 'yaml'
import { ValidationError } from '../error'
import { getSealedSecretsCertificate, isK8sReachable, UserSecretData } from '../k8s_operations'

const debug = Debug('otomi:sealedSecretUtils')
const env = cleanEnv({})

// Kubeseal RSA-encrypted ciphertext, once base64-encoded, is typically 300+ characters.
// A conservative minimum length to distinguish from plain text values like passwords or API keys.
const MIN_SEALED_SECRET_CIPHERTEXT_LENGTH = 200
const SEALED_SECRET_CIPHERTEXT_PATTERN = /^[A-Za-z0-9+/=]+$/

export function sealedSecretManifest(
  teamId: string | undefined,
  data: SealedSecretManifestRequest,
  namespaceParam?: string,
): SealedSecretManifestResponse {
  const { annotations, labels, finalizers } = data.spec?.template?.metadata || {}
  const namespace = namespaceParam ?? `team-${teamId}`

  return {
    apiVersion: 'bitnami.com/v1alpha1',
    kind: 'SealedSecret',
    metadata: {
      name: data.metadata.name,
      annotations: {
        'sealedsecrets.bitnami.com/namespace-wide': 'true',
      },
      ...(teamId && {
        labels: {
          'apl.io/teamId': teamId,
        },
      }),
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
  } as SealedSecretManifestResponse
}

export function ensureSealedSecretMetadata(
  manifest: SealedSecretManifestResponse,
  teamId?: string,
): SealedSecretManifestResponse {
  const hasCorrectLabel = teamId ? manifest.metadata.labels?.['apl.io/teamId'] === teamId : true
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
        ...(teamId && { 'apl.io/teamId': teamId }),
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
    if (env.isDev && !(await isK8sReachable())) return ''
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

function isEncryptedValue(value: string): boolean {
  if (value.length < MIN_SEALED_SECRET_CIPHERTEXT_LENGTH) return false
  return SEALED_SECRET_CIPHERTEXT_PATTERN.test(value)
}

export async function encryptSecretValue(pem: string, namespace: string, value: string): Promise<string> {
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

export function sealedSecretToUserData(manifest: SealedSecretManifestResponse): UserSecretData {
  const data = manifest.spec.encryptedData
  return {
    id: manifest.metadata.name,
    email: data.email || '',
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    initialPassword: data.initialPassword || '',
    isPlatformAdmin: data.isPlatformAdmin === 'true',
    isTeamAdmin: data.isTeamAdmin === 'true',
    teams: typeof data.teams === 'string' ? JSON.parse(data.teams) : data.teams || [],
  } as UserSecretData
}

/**
 * Creates a SealedSecret manifest for a platform-level secret (not team-scoped).
 * Used for secrets in apl-secrets, apl-users, and other platform namespaces.
 */
export async function createPlatformSealedSecretManifest(
  name: string,
  namespace: string,
  data: Record<string, string>,
): Promise<string> {
  const pem = await getSealedSecretsPEM()

  // In dev mode (no PEM), store values as plain text
  const encryptedData: Record<string, string> = {}
  if (pem) {
    for (const [key, value] of Object.entries(data)) {
      encryptedData[key] = await encryptSecretValue(pem, namespace, value)
    }
  } else {
    Object.assign(encryptedData, data)
  }

  const manifest = {
    apiVersion: 'bitnami.com/v1alpha1',
    kind: 'SealedSecret',
    metadata: {
      annotations: {
        'sealedsecrets.bitnami.com/namespace-wide': 'true',
      },
      name,
      namespace,
    },
    spec: {
      encryptedData,
      template: {
        immutable: false,
        metadata: { name, namespace },
        type: 'kubernetes.io/opaque',
      },
    },
  }

  return stringifyYaml(manifest, undefined, { indent: 4, sortMapEntries: true })
}

/**
 * Creates a SealedSecret manifest YAML for a user in the apl-users namespace.
 * All user fields are encrypted as individual keys.
 */
export async function createUserSealedSecret(user: User): Promise<string> {
  const namespace = APL_USERS_NAMESPACE
  const name = user.id as string

  const data: Record<string, string> = {
    email: user.email,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    initialPassword: user.initialPassword || '',
    isPlatformAdmin: String(user.isPlatformAdmin || false),
    isTeamAdmin: String(user.isTeamAdmin || false),
    teams: JSON.stringify(user.teams || []),
  }

  return createPlatformSealedSecretManifest(name, namespace, data)
}

/**
 * Walks a JSON schema and returns dot-paths to all properties marked with `x-secret`.
 * Schema keywords (properties, items, anyOf, etc.) and numeric array indices are stripped from paths.
 */
export function extractSecretPaths(schema: Record<string, any>, prefix = ''): string[] {
  const paths: string[] = []
  if (!schema || typeof schema !== 'object') return paths

  if (schema.properties) {
    const properties = schema.properties as Record<string, Record<string, unknown>>
    for (const [key, value] of Object.entries(properties)) {
      const childPath = prefix ? `${prefix}.${key}` : key
      const prop = value as Record<string, any>
      if (prop && 'x-secret' in prop) {
        paths.push(childPath)
      }
      paths.push(...extractSecretPaths(prop, childPath))
    }
  }

  if (schema.definitions) {
    const definitions = schema.definitions as Record<string, Record<string, unknown>>
    for (const [key, value] of Object.entries(definitions)) {
      const childPath = prefix ? `${prefix}.${key}` : key
      const def = value as Record<string, any>
      if (def && 'x-secret' in def) {
        paths.push(childPath)
      }
      paths.push(...extractSecretPaths(def, childPath))
    }
  }

  if (schema.items) {
    // items shares the same prefix (array items don't add path segments)
    paths.push(...extractSecretPaths(schema.items as Record<string, any>, prefix))
  }

  for (const keyword of ['anyOf', 'allOf', 'oneOf']) {
    if (Array.isArray(schema[keyword])) {
      for (const branch of schema[keyword]) {
        paths.push(...extractSecretPaths(branch as Record<string, any>, prefix))
      }
    }
  }

  return [...new Set(paths)]
}

/**
 * Extracts secret values from a settings data object at the given dot-paths.
 * Returns a flat record mapping dot-paths to their string values (only non-empty).
 */
export function extractSettingsSecrets(secretPaths: string[], data: Record<string, any>): Record<string, string> {
  const secrets: Record<string, string> = {}
  for (const path of secretPaths) {
    const value = get(data, path)
    if (value !== undefined && value !== null && value !== '') {
      const dataKey = path.replace(/\./g, '_')
      secrets[dataKey] = String(value)
    }
  }
  return secrets
}

/**
 * Removes secret values from a settings data object at the given dot-paths.
 * Mutates the data object in place and returns it.
 */
export function removeSettingsSecrets(secretPaths: string[], data: Record<string, any>): Record<string, any> {
  for (const path of secretPaths) {
    unset(data, path)
  }
  return data
}
