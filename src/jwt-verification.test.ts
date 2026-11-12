const mockJwtVerify = jest.fn()
jest.mock('jose', () => ({ createRemoteJWKSet: jest.fn(), jwtVerify: mockJwtVerify }))

import { verifyJwt } from './jwt-verification'

describe('verifyJwt', () => {
  const base = { sub: 'sub-1', email: 'jane@example.com', groups: ['team-demo'] }

  // Keycloak omits name for users without a first and last name; that must not block login.
  it('accepts a token without a name claim', async () => {
    mockJwtVerify.mockResolvedValue({ payload: base })
    await expect(verifyJwt('Bearer t')).resolves.toMatchObject(base)
  })

  it('rejects a token without email or sub', async () => {
    mockJwtVerify.mockResolvedValue({ payload: { sub: 'sub-1' } })
    await expect(verifyJwt('t')).rejects.toThrow('JWT missing required claims')
    mockJwtVerify.mockResolvedValue({ payload: { email: base.email } })
    await expect(verifyJwt('t')).rejects.toThrow('JWT missing required claims')
  })
})
