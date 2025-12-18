import { createRemoteJWKSet, JWTPayload, jwtVerify } from 'jose'
import Debug from 'debug'
import retry from 'async-retry'
import {
  cleanEnv,
  JWT_AUDIENCE,
  SSO_ISSUER,
  SSO_JWKS_URI,
  STARTUP_RETRY_COUNT,
  STARTUP_RETRY_INTERVAL_MS,
} from 'src/validators'

const debug = Debug('otomi:jwt')
const env = cleanEnv({ SSO_ISSUER, JWT_AUDIENCE, SSO_JWKS_URI, STARTUP_RETRY_COUNT, STARTUP_RETRY_INTERVAL_MS })
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
    throw error
  }
}

export async function waitForJwksReady(): Promise<void> {
  debug('Waiting for JWKS endpoint to become ready...')

  await retry(
    async () => {
      try {
        // Try a dummy verification with an invalid token
        // We only care that JWKS fetch succeeds, not that the token is valid
        const invalidJWT = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.invalid_signature'                                                                                               
        await verifyJwt(invalidJWT)
      } catch (err: any) {
        // If we get a JWT verification error, JWKS successfully fetched and processed the token
        // This means JWKS is working! (Even though token was rejected - that's expected)
        const isJwtVerificationError =
          err?.code?.startsWith('ERR_JW') || // jose library error codes (ERR_JWS_INVALID, ERR_JWT_INVALID, etc.)
          err?.message?.includes('signature') ||
          err?.message?.includes('invalid') ||
          err?.message?.includes('expired') ||
          err?.message?.includes('claim')

        if (isJwtVerificationError) {
          debug('JWKS endpoint reachable (token verification worked) — continuing startup.')
          return
        }

        debug(`JWKS not ready yet: ${err.message}, retrying...`)
        throw err
      }
    },
    {
      retries: env.STARTUP_RETRY_COUNT,
      minTimeout: env.STARTUP_RETRY_INTERVAL_MS,
      maxTimeout: env.STARTUP_RETRY_INTERVAL_MS,
    },
  )
}
