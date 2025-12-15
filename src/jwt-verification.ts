import { createRemoteJWKSet, jwtVerify } from 'jose'
import Debug from 'debug'
import { cleanEnv, JWT_AUDIENCE, OIDC_ENDPOINT } from 'src/validators'

const debug = Debug('otomi:jwt')
const env = cleanEnv({ OIDC_ENDPOINT, JWT_AUDIENCE })

// JWKS endpoint - adjust based on your Keycloak/auth setup
const JWKS_URL = `${env.OIDC_ENDPOINT}/protocol/openid-connect/certs`

// Create remote JWKS - automatically caches and refreshes keys
const JWKS = createRemoteJWKSet(new URL(JWKS_URL))

export interface JWTPayload {
  name: string
  email: string
  sub: string
  roles?: string[]
  groups?: string[]
  iss?: string
  aud?: string | string[]
  exp?: number
  iat?: number
}

/**
 * Verify JWT token cryptographically using JWKS
 * @param token - JWT token (with or without "Bearer " prefix)
 * @returns Verified JWT payload
 * @throws Error if verification fails
 */
export async function verifyJwt(token: string): Promise<JWTPayload> {
  // Remove "Bearer " prefix if present
  const bearerToken = token.replace(/^Bearer\s+/i, '')

  try {
    const { payload } = await jwtVerify(bearerToken, JWKS, {
      issuer: env.OIDC_ENDPOINT,
      audience: env.JWT_AUDIENCE, // Adjust to your configured audience
    })

    debug('JWT verified successfully:', payload.sub)

    // Extract custom claims from verified payload
    return {
      name: payload.name as string,
      email: payload.email as string,
      sub: payload.sub as string,
      roles: payload.roles as string[] | undefined,
      groups: payload.groups as string[] | undefined,
      iss: payload.iss,
      aud: payload.aud,
      exp: payload.exp,
      iat: payload.iat,
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
  const RETRY_MS = 2000
  const MAX_RETRIES = 30 // 1 minute total

  debug('Waiting for JWKS endpoint to become ready...')

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Try a dummy verification - we only care that JWKS fetch succeeds
      // The verification will fail (invalid token), but JWKS fetch should work
      await verifyJwt('invalid.fake.token').catch(() => {
        // Expected to fail - we just wanted JWKS to be fetchable
      })

      debug('JWKS endpoint reachable — continuing startup.')
      return
    } catch (err: any) {
      // Check if error is network/connection related (not verification)
      if (err?.code === 'ECONNREFUSED' || err?.message?.includes('fetch')) {
        debug(`JWKS not ready yet (attempt ${attempt + 1}/${MAX_RETRIES}), retrying...`)
        await new Promise((r) => setTimeout(r, RETRY_MS))
      } else {
        // JWKS is reachable, just token validation failed (expected)
        debug('JWKS endpoint reachable — continuing startup.')
        return
      }
    }
  }

  throw new Error('JWKS endpoint did not become ready within timeout')
}
