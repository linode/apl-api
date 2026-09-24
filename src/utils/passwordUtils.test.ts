import bcrypt from 'bcryptjs'
import { hashPassword } from './passwordUtils'

describe('hashPassword', () => {
  it('returns a bcrypt hash that verifies against the original plaintext', async () => {
    const hash = await hashPassword('Sup3r$ecret!')
    expect(hash).not.toEqual('Sup3r$ecret!')
    expect(await bcrypt.compare('Sup3r$ecret!', hash)).toBe(true)
  })

  it('produces a different hash each time (salted)', async () => {
    const [a, b] = await Promise.all([hashPassword('same-input'), hashPassword('same-input')])
    expect(a).not.toEqual(b)
  })
})
