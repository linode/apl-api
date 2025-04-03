import crypto, { X509Certificate } from 'crypto'
import { isEmpty } from 'lodash'
import { AplSecretResponse } from 'src/otomi-models'
import { getSealedSecretsCertificate } from '../k8s_operations'
import { ValidationError } from '../error'

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

export async function getEncryptedData(
  decryptedData: Record<string, string | undefined> | undefined,
  name: string,
  namespace: string,
): Promise<Record<string, string>> {
  const certificate = await getSealedSecretsCertificate()
  if (!certificate) {
    const err = new ValidationError()
    err.publicMessage = 'SealedSecrets certificate not found'
    throw err
  }
  const encryptedDataPromises = Object.entries(decryptedData || {}).map(([key, value]) => {
    if (value === undefined) {
      return { [key]: value }
    }
    const encryptedItem = encryptSecretItem(certificate, name, namespace, value, 'namespace-wide')
    return { [key]: encryptedItem }
  })
  return Object.assign({}, ...(await Promise.all(encryptedDataPromises || [])))
}

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
