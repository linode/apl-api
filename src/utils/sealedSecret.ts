import crypto, { X509Certificate } from 'crypto'
import { readFile } from 'fs/promises'
import * as osPath from 'path'

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

export async function encryptSecretItem(secretName, ns, data, scope) {
  const certPath = osPath.resolve(__dirname, '../license/public.pem')
  const certificate = await readFile(certPath, 'utf8')
  const pubKey = getPublicKey(certificate)
  const label = encryptionLabel(ns, secretName, scope)
  const out = hybridEncrypt(pubKey, data, label)
  return out
}
