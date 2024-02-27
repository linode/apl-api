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
  const anno = body.metadata?.annotations || {}
  const annotations = {} as any
  for (const key in anno) {
    if (key !== 'reconcile.external-secrets.io/data-hash') {
      annotations.key = key
      annotations.value = anno[key]
    }
  }
  const lbl = body.metadata?.labels || {}
  const labels = {} as any
  for (const key in lbl) {
    labels.key = key
    labels.value = lbl[key]
  }
  const metadata = {
    ...(!isEmpty(annotations) && { annotations }),
    ...(!isEmpty(body.metadata.finalizers) && { finalizers: body.metadata.finalizers }),
    ...(!isEmpty(labels) && { labels }),
  }
  const encryptedData = [] as any
  for (const key in body.data) {
    if (Object.prototype.hasOwnProperty.call(body.data, key)) {
      const encryptedValue = Buffer.from(body.data[key], 'base64').toString('utf-8')
      encryptedData.push({
        key,
        value: encryptedValue,
      })
    }
  }
  const types = {
    Opaque: 'kubernetes.io/opaque',
    DockerConfig: 'kubernetes.io/dockerconfigjson',
    tls: 'kubernetes.io/tls',
  }
  const data = {
    name: body.metadata.name,
    namespace: body.metadata.namespace,
    ...(body.immutable && { immutable: body.immutable }),
    ...(!isEmpty(metadata) && { metadata }),
    encryptedData,
    type: types[body.type],
  } as SealedSecret
  return data
}
