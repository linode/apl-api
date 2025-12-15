import { createRemoteJWKSet, JWTPayload, jwtVerify } from 'jose'
import Debug from 'debug'
import retry from 'async-retry'
import { cleanEnv, JWT_AUDIENCE, SSO_ISSUER, SSO_JWKS_URI } from 'src/validators'

const debug = Debug('otomi:jwt')
const env = cleanEnv({ SSO_ISSUER, JWT_AUDIENCE, SSO_JWKS_URI })
const JWKS_URL = env.SSO_JWKS_URI

// Create remote JWKS - automatically caches and refreshes keys
const JWKS = createRemoteJWKSet(new URL(JWKS_URL))

export interface AppJWTPayload extends JWTPayload {
  name: string
  email: string
  sub: string
  groups: string[]
  roles: string[]
}

export async function verifyJwt(token: string): Promise<AppJWTPayload> {
  // Remove "Bearer " prefix if present
  const bearerToken = token.replace(/^Bearer\s+/i, '')

  try {
    const { payload } = await jwtVerify(bearerToken, JWKS, {
      issuer: env.SSO_ISSUER,
      audience: env.JWT_AUDIENCE,
    })
    if (!payload.email || !payload.name || !payload.sub) {
      throw new Error('JWT missing required claims')
    }
    debug('JWT verified successfully:', payload.sub)

    return {
      payload,
      email: payload.email as string,
      name: payload.name as string,
      sub: payload.sub,
      groups: (payload.groups as string[]) || [],
      roles: (payload.roles as string[]) || [],
    }
  } catch (error: any) {
    debug('JWT verification failed:', error.message)
    throw new Error(`JWT verification failed: ${error.message}`)
  }
}

/**
 * Wait for JWKS endpoint to become ready during startup
 * This prevents race conditions during pod initialization
 */
export async function waitForJwksReady(): Promise<void> {
  debug('Waiting for JWKS endpoint to become ready...')

  await retry(
    async () => {
      try {
        // Try a dummy verification, we only care that JWKS fetch succeeds
        // The verification will fail (invalid token), but JWKS fetch should work
        await verifyJwt('invalid.fake.token').catch(() => {})

        debug('JWKS endpoint reachable — continuing startup.')
      } catch (err: any) {
        // Check if error is network/connection related (not verification)
        if (err?.code === 'ECONNREFUSED' || err?.message?.includes('fetch')) {
          debug(`JWKS not ready yet, retrying...`)
          throw err // Retry
        } else {
          // JWKS is reachable, just token validation failed (expected)
          debug('JWKS endpoint reachable — continuing startup.')
          return
        }
      }
    },
    {
      retries: 300, // 10 minutes total with 2s minTimeout
      minTimeout: 2000,
      maxTimeout: 2000,
    },
  )
}
