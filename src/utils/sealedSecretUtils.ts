import crypto, { X509Certificate } from 'crypto'
import { SealedSecret } from 'src/otomi-models'

function hybridEncrypt(pubKey, plaintext, label) {
  const sessionKey = crypto.randomBytes(32)
  const cipher = crypto.createCipheriv('aes-256-gcm', sessionKey, Buffer.alloc(12, 0))
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const rsaEncryptedKey = crypto.publicEncrypt(
    {
      key: pubKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
      oaepLabel: label,
    },
    sessionKey,
  )
  const lenBuffer = Buffer.alloc(2)
  lenBuffer.writeUInt16BE(rsaEncryptedKey.length, 0)
  const finalCiphertext = Buffer.concat([lenBuffer, rsaEncryptedKey, encrypted, cipher.getAuthTag()])
  return finalCiphertext.toString('base64')
}

function encryptionLabel(ns, secretName, scope) {
  // Implement the logic to generate the label based on namespace, secret name, and scope
  return `${ns}`
}

function getPublicKey(certificate) {
  const x509 = new X509Certificate(certificate)
  const value = x509.publicKey
  return value.export({
    format: 'pem',
    type: 'spki',
  })
}

export function encryptSecretItem(certificate, secretName, ns, data, scope) {
  const pubKey = getPublicKey(certificate)
  const label = encryptionLabel(ns, secretName, scope)
  const out = hybridEncrypt(pubKey, data, label)
  return out
}

export type EncryptedDataRecord = Record<string, string>

export interface SealedSecretManifestType {
  apiVersion: string
  kind: string
  metadata: {
    name: string
    namespace: string
    annotations?: any
    finalizers?: string[]
    labels?: {
      key: string
      value: string
    }[]
  }
  spec: {
    encryptedData: EncryptedDataRecord
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
      }
    }
  }
}

export function SealedSecretManifest(
  data: SealedSecret,
  encryptedData: EncryptedDataRecord,
  namespace: string,
): SealedSecretManifestType {
  const SealedSecretSchema = {
    apiVersion: 'bitnami.com/v1alpha1',
    kind: 'SealedSecret',
    metadata: {
      ...data.metadata,
      annotations: {
        'sealedsecrets.bitnami.com/namespace-wide': 'true',
      },
      name: data.name,
      namespace,
    },
    spec: {
      encryptedData,
      template: {
        type: data.type || 'kubernetes.io/opaque',
        immutable: data.immutable || false,
        metadata: {
          name: data.name,
          namespace,
        },
      },
    },
  }

  return SealedSecretSchema
}
