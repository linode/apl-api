import { ValidationError } from 'src/error'

function isLowerCase(str) {
  return str === str.toLowerCase()
}

function isTTLInHours(ttl) {
  const ttlPattern = /^(\d+)\s*(h)$/i
  const match = ttl.match(ttlPattern)
  if (match && match[2] === 'h') return true
  return false
}

export function validateBackupFields(name, ttl) {
  if (name && !isLowerCase(name)) {
    const err = new ValidationError('Backup name must be lowercase!')
    err.publicMessage = 'Backup name must be lowercase!'
    throw err
  }
  if (ttl && ttl !== '0' && !isTTLInHours(ttl)) {
    const err = new ValidationError('TTL must be in hours!')
    err.publicMessage = 'TTL must be in hours!'
    throw err
  }
}
