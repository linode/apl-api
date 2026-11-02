import express from 'express'
import request from 'supertest'

let mockTrustProxy = 1

jest.mock('src/validators', () => ({
  cleanEnv: () => ({
    RATE_LIMIT_WINDOW_MS: 60_000,
    RATE_LIMIT_MAX_REQUESTS: 100,
    RATE_LIMIT_AUTH_MAX_ATTEMPTS: 2,
    TRUST_PROXY: mockTrustProxy,
  }),
}))

describe('socket authentication rate limiting', () => {
  let rateLimits: typeof import('./rate-limit')

  beforeEach(async () => {
    jest.resetModules()
    jest.useFakeTimers()
    mockTrustProxy = 1
    rateLimits = await import('./rate-limit')
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('blocks attempts above the configured limit and reports retry metadata', async () => {
    await rateLimits.beginSocketAuthAttempt('192.0.2.1', {})
    await rateLimits.beginSocketAuthAttempt('192.0.2.1', {})

    await expect(rateLimits.beginSocketAuthAttempt('192.0.2.1', {})).rejects.toMatchObject({
      message: 'Too many authentication attempts from this IP, please try again later.',
      data: { status: 429, retryAfter: 60 },
    })
  })

  it('does not count successful authentication attempts', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const complete = await rateLimits.beginSocketAuthAttempt('192.0.2.1', {})
      await complete()
    }

    await expect(rateLimits.beginSocketAuthAttempt('192.0.2.1', {})).resolves.toBeInstanceOf(Function)
  })

  it('reserves concurrent attempts before authentication completes', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 3 }, () => rateLimits.beginSocketAuthAttempt('192.0.2.1', {})),
    )

    expect(results.filter(({ status }) => status === 'fulfilled').length).toBeLessThanOrEqual(2)
    expect(results.some(({ status }) => status === 'rejected')).toBe(true)
    await expect(rateLimits.beginSocketAuthAttempt('192.0.2.1', {})).rejects.toBeInstanceOf(
      rateLimits.SocketAuthRateLimitError,
    )
  })

  it('allows attempts again after the configured window', async () => {
    await rateLimits.beginSocketAuthAttempt('192.0.2.1', {})
    await rateLimits.beginSocketAuthAttempt('192.0.2.1', {})
    jest.advanceTimersByTime(60_000)

    await expect(rateLimits.beginSocketAuthAttempt('192.0.2.1', {})).resolves.toBeInstanceOf(Function)
  })

  it('keeps separate counters for different client IPs behind a trusted proxy', async () => {
    const headers = { 'x-forwarded-for': '192.0.2.1' }
    await rateLimits.beginSocketAuthAttempt('10.0.0.1', headers)
    await rateLimits.beginSocketAuthAttempt('10.0.0.1', headers)

    await expect(
      rateLimits.beginSocketAuthAttempt('10.0.0.1', { 'x-forwarded-for': '192.0.2.2' }),
    ).resolves.toBeInstanceOf(Function)
    await expect(
      rateLimits.beginSocketAuthAttempt('10.0.0.1', { 'x-forwarded-for': 'spoofed, 192.0.2.1' }),
    ).rejects.toBeInstanceOf(rateLimits.SocketAuthRateLimitError)
  })

  it('groups IPv6 clients by subnet like the REST limiter', async () => {
    await rateLimits.beginSocketAuthAttempt('2001:db8::1', {})
    await rateLimits.beginSocketAuthAttempt('2001:db8::2', {})

    await expect(rateLimits.beginSocketAuthAttempt('2001:db8::3', {})).rejects.toBeInstanceOf(
      rateLimits.SocketAuthRateLimitError,
    )
  })

  it('ignores forwarded addresses when proxy trust is disabled', async () => {
    jest.resetModules()
    mockTrustProxy = 0
    rateLimits = await import('./rate-limit')
    await rateLimits.beginSocketAuthAttempt('192.0.2.1', { 'x-forwarded-for': '192.0.2.2' })
    await rateLimits.beginSocketAuthAttempt('192.0.2.1', { 'x-forwarded-for': '192.0.2.3' })

    await expect(
      rateLimits.beginSocketAuthAttempt('192.0.2.1', { 'x-forwarded-for': '192.0.2.4' }),
    ).rejects.toBeInstanceOf(rateLimits.SocketAuthRateLimitError)
  })

  it('uses the configured number of trusted proxy hops', async () => {
    jest.resetModules()
    mockTrustProxy = 2
    rateLimits = await import('./rate-limit')
    const headers = { 'x-forwarded-for': '192.0.2.1, 10.0.0.2' }
    await rateLimits.beginSocketAuthAttempt('10.0.0.1', headers)
    await rateLimits.beginSocketAuthAttempt('10.0.0.1', headers)

    await expect(rateLimits.beginSocketAuthAttempt('192.0.2.1', {})).rejects.toBeInstanceOf(
      rateLimits.SocketAuthRateLimitError,
    )
    await expect(rateLimits.beginSocketAuthAttempt('10.0.0.2', {})).resolves.toBeInstanceOf(Function)
  })

  it('rejects invalid client addresses', async () => {
    await expect(rateLimits.beginSocketAuthAttempt('invalid', {})).rejects.toThrow('Invalid socket client IP address')
  })

  it('shares the failed-attempt budget with REST authentication', async () => {
    jest.useRealTimers()
    const app = express()
    app.set('trust proxy', 1)
    app.use(rateLimits.authRateLimiter)
    app.get('/', (_req, res) => {
      res.sendStatus(401)
    })
    await request(app).get('/').set('Authorization', 'invalid').set('X-Forwarded-For', '192.0.2.1').expect(401)
    await rateLimits.beginSocketAuthAttempt('192.0.2.1', {})

    await request(app).get('/').set('Authorization', 'invalid').set('X-Forwarded-For', '192.0.2.1').expect(429)
  })
})
