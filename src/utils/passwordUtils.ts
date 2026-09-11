import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS)
}
