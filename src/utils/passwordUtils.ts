import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

const BCRYPT_MAX_BYTES = 72

export async function hashPassword(plaintext: string): Promise<string> {
  if (Buffer.byteLength(plaintext, 'utf-8') > BCRYPT_MAX_BYTES) {
    throw new Error(`Password must be at most ${BCRYPT_MAX_BYTES} bytes.`)
  }
  return bcrypt.hash(plaintext, SALT_ROUNDS)
}
