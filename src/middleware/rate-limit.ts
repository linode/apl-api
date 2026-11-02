import rateLimit, { ipKeyGenerator, MemoryStore } from 'express-rate-limit'
import { IncomingHttpHeaders } from 'http'
import { isIP } from 'net'
import {
  cleanEnv,
  RATE_LIMIT_AUTH_MAX_ATTEMPTS,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  TRUST_PROXY,
} from 'src/validators'

const env = cleanEnv({
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_AUTH_MAX_ATTEMPTS,
  TRUST_PROXY,
})

const authLimitMessage = 'Too many authentication attempts from this IP, please try again later.'

export class SocketAuthRateLimitError extends Error {
  readonly data: { status: number; retryAfter: number }

  constructor(retryAfter: number) {
    super(authLimitMessage)
    this.data = { status: 429, retryAfter }
  }
}

const authStore = new MemoryStore()

export async function beginSocketAuthAttempt(
  address: string,
  headers: IncomingHttpHeaders,
): Promise<() => Promise<void>> {
  // Match Express's numeric trust-proxy setting: walk from the nearest hop.
  const forwarded = headers['x-forwarded-for']
  const addresses = [
    address,
    ...(typeof forwarded === 'string'
      ? forwarded
          .split(',')
          .map((ip) => ip.trim())
          .reverse()
      : []),
  ]
  const ip = addresses[Math.min(Math.max(0, Math.ceil(env.TRUST_PROXY)), addresses.length - 1)]
  if (!isIP(ip)) throw new Error('Invalid socket client IP address')

  const key = ipKeyGenerator(ip)
  const { totalHits, resetTime } = await authStore.increment(key)
  if (totalHits > env.RATE_LIMIT_AUTH_MAX_ATTEMPTS) {
    const retryAfter = resetTime
      ? Math.ceil((resetTime.getTime() - Date.now()) / 1000)
      : env.RATE_LIMIT_WINDOW_MS / 1000
    throw new SocketAuthRateLimitError(Math.max(0, Math.ceil(retryAfter)))
  }

  // Reserve before verification so concurrent attempts cannot bypass the limit.
  // Successful authentication releases the reservation, just as for REST.
  return () => authStore.decrement(key)
}

/**
 * General API rate limiter
 *
 * Purpose: Prevents DoS attacks by limiting total requests per IP
 *
 * Behavior:
 * - Counts ALL requests (both authenticated and unauthenticated)
 * - Returns 429 Too Many Requests when limit exceeded
 * - Sends RateLimit-* headers to inform clients of limits
 *
 * Example:
 * - With defaults: Legitimate user making 101 requests in 5 minutes → request 101 blocked
 * - Protects against general API abuse and excessive polling
 *
 */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.floor(env.RATE_LIMIT_WINDOW_MS / 1000),
  },
  // Skip rate limiting for CORS preflight requests
  skip: (req) => req.method === 'OPTIONS',
})

/**
 * Authentication rate limiter
 *
 * Purpose: Prevents JWT brute force attacks and token guessing
 *
 * Behavior:
 * - Only counts FAILED authentication attempts (skipSuccessfulRequests: true)
 * - Valid tokens do NOT count against the limit
 * - Invalid/expired tokens DO count against the limit
 * - Returns 429 Too Many Requests after reaching max attempts
 *
 * Why this matters:
 * - Attackers CANNOT make unlimited JWT verification attempts
 * - Legitimate users with valid tokens can work normally (no limits)
 * - JWT cryptographic operations are expensive - this protects server resources
 *
 * Example scenarios (with default config):
 * 1. Legitimate user with valid token:
 *    - Makes 100 requests → ✅ All succeed (not counted by this limiter)
 *
 * 2. Attacker with invalid tokens:
 *    - Attempts 1-20 → ❌ 401 Unauthorized (counted)
 *    - Attempt 11+ → ❌ 429 Too Many Requests (rate limited, attack blocked)
 *
 * 3. User with expired token:
 *    - Attempts 1-20 → ❌ 401 Unauthorized (counted)
 *    - After 10 attempts → ❌ 429 (user must wait or refresh token elsewhere)
 *
 */
export const authRateLimiter = rateLimit({
  store: authStore,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_AUTH_MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: authLimitMessage,
    retryAfter: Math.floor(env.RATE_LIMIT_WINDOW_MS / 1000),
  },
  // Only count requests with Authorization header
  skip: (req) => !req.header('Authorization'),
  // CRITICAL: Only count failed auth attempts - allows legitimate users to work normally
  skipSuccessfulRequests: true,
})
