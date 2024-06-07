import crypto, { X509Certificate } from 'crypto'
import { isEmpty } from 'lodash'
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

export function prepareSealedSecretData(body) {
  const bodyAnnotations = body.metadata?.annotations || {}
  const annotations: Record<string, string> = {}
  for (const key in bodyAnnotations) annotations[key] = bodyAnnotations[key]

  const bodyLabels = body.metadata?.labels || {}
  const labels: Record<string, string> = {}
  for (const key in bodyLabels) labels[key] = bodyLabels[key]

  const metadata = {
    ...(!isEmpty(annotations) && { annotations }),
    ...(!isEmpty(body.metadata.finalizers) && { finalizers: body.metadata.finalizers }),
    ...(!isEmpty(labels) && { labels }),
  }

  const encryptedData = Object.entries(body.data || {}).map(([key, value]) => ({
    key,
    value: Buffer.from(value as string, 'base64').toString('utf-8'),
  }))

  const type = body.type === 'Opaque' ? 'kubernetes.io/opaque' : body.type

  const data = {
    name: body.metadata.name,
    namespace: body.metadata.namespace,
    ...(body.immutable && { immutable: body.immutable }),
    ...(!isEmpty(metadata) && { metadata }),
    encryptedData,
    type,
  } as SealedSecret
  return data
}
