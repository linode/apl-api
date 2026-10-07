import type { NextFunction, Request, Response } from 'express'
import type http from 'http'
import type { Server, Socket } from 'socket.io'
import type { OpenApiRequestExt } from 'src/otomi-models'

const mockRemove = jest.fn()
const mockRm = jest.fn()
const mockUuidv4 = jest.fn()
const mockSetApiStatusInConfigMap = jest.fn()
const mockVerifyJwt = jest.fn()
const mockIoUse = jest.fn()
const mockIoOn = jest.fn()
const mockIoOf = jest.fn()
const mockBeginSocketAuthAttempt = jest.fn()
const mockCompleteAuthAttempt = jest.fn()

const mockReadOnlyInit = jest.fn()
const mockReadOnlySetLocked = jest.fn()
const mockRemoveWorktree = jest.fn()

const mockSessionInitGitWorktree = jest.fn()
const mockSessionCopyFrom = jest.fn()

const readOnlyStack = {
  init: mockReadOnlyInit,
  isLoaded: true,
  locked: false,
  setLocked: mockReadOnlySetLocked,
  git: {
    removeWorktree: mockRemoveWorktree,
  },
  fileStore: {},
}

const sessionStack = {
  initGitWorktree: mockSessionInitGitWorktree,
  sessionId: 'test-session-id',
  git: {},
  fileStore: {
    copyFrom: mockSessionCopyFrom,
  },
}

/*
 * This must be a constructable function because production code calls:
 *
 * new OtomiStack()
 * new OtomiStack(editor, sessionId)
 */
const mockOtomiStack = jest.fn(function mockOtomiStackFn(this: unknown, editor?: string, sessionId?: string) {
  if (editor) {
    sessionStack.sessionId = sessionId ?? 'test-session-id'
    return sessionStack
  }

  return readOnlyStack
})

jest.mock('fs-extra', () => ({
  remove: (...args: unknown[]) => mockRemove(...args),
}))

jest.mock('fs/promises', () => ({
  rm: (...args: unknown[]) => mockRm(...args),
}))

jest.mock('uuid', () => ({
  v4: () => mockUuidv4(),
}))

jest.mock('../k8s-operations', () => ({
  setApiStatusInConfigMap: (...args: unknown[]) => mockSetApiStatusInConfigMap(...args),
}))

jest.mock('../utils', () => ({
  getSanitizedErrorMessage: (error: unknown) => (error instanceof Error ? error.message : String(error)),
}))

jest.mock('src/validators', () => ({
  API_NAMESPACE: {},
  EDITOR_INACTIVITY_TIMEOUT: {},
  cleanEnv: () => ({
    /*
     * Keep this false so setSessionStack creates an actual session stack.
     * The read-only stack is initialized explicitly in runMiddleware().
     */
    isTest: false,
    API_NAMESPACE: 'apl',
    EDITOR_INACTIVITY_TIMEOUT: 60_000,
  }),
}))

jest.mock('src/otomi-stack', () => ({
  __esModule: true,
  default: mockOtomiStack,
  rootPath: '/tmp/otomi/values',
}))

jest.mock('src/jwt-verification', () => ({
  verifyJwt: (...args: unknown[]) => mockVerifyJwt(...args),
}))

jest.mock('./rate-limit', () => ({
  beginSocketAuthAttempt: (...args: unknown[]) => mockBeginSocketAuthAttempt(...args),
  SocketAuthRateLimitError: class extends Error {
    data = { status: 429, retryAfter: 60 }
  },
}))

jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    use: mockIoUse,
    on: mockIoOn,
    of: mockIoOf,
  })),
}))

type SessionModule = typeof import('./session')

const createRequest = (method: string): OpenApiRequestExt =>
  ({
    method,
    path: '/v2/catalogs/test-catalog',
    user: {
      email: 'platform-admin@example.com',
    },
  }) as unknown as OpenApiRequestExt

const createResponse = (): Response => ({}) as Response

describe('session middleware', () => {
  let sessionModule: SessionModule

  beforeEach(async () => {
    jest.clearAllMocks()
    jest.resetModules()

    readOnlyStack.isLoaded = true
    readOnlyStack.locked = false
    sessionStack.sessionId = 'test-session-id'

    mockReadOnlyInit.mockResolvedValue(undefined)
    mockSessionInitGitWorktree.mockResolvedValue(undefined)
    mockRemoveWorktree.mockResolvedValue(undefined)
    mockRemove.mockResolvedValue(undefined)
    mockRm.mockResolvedValue(undefined)
    mockSetApiStatusInConfigMap.mockResolvedValue(undefined)
    mockUuidv4.mockReturnValue('test-session-id')

    sessionModule = await import('./session')
  })

  const runMiddleware = async (
    method: string,
  ): Promise<{
    req: OpenApiRequestExt
    next: jest.MockedFunction<NextFunction>
  }> => {
    /*
     * Middleware refuses requests until the read-only stack exists and has
     * finished loading, so initialize it before invoking the middleware.
     */
    await sessionModule.getSessionStack()

    const middleware = sessionModule.sessionMiddleware(undefined as unknown as http.Server)

    const req = createRequest(method)
    const res = createResponse()
    const next = jest.fn() as jest.MockedFunction<NextFunction>

    await middleware(req as unknown as Request, res, next)

    return { req, next }
  }

  describe('read requests', () => {
    it.each(['GET', 'HEAD', 'OPTIONS'])('uses the read-only stack for %s requests', async (method) => {
      const { req, next } = await runMiddleware(method)

      expect(req.otomi).toBe(readOnlyStack)
      expect(mockUuidv4).not.toHaveBeenCalled()
      expect(mockSessionInitGitWorktree).not.toHaveBeenCalled()
      expect(mockSessionCopyFrom).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  describe('write requests', () => {
    it.each(['PATCH', 'POST', 'PUT', 'DELETE'])('creates an isolated session stack for %s requests', async (method) => {
      const { req, next } = await runMiddleware(method)

      expect(mockUuidv4).toHaveBeenCalledTimes(1)

      expect(mockOtomiStack).toHaveBeenCalledWith('platform-admin@example.com', 'test-session-id')

      expect(mockSessionInitGitWorktree).toHaveBeenCalledWith(readOnlyStack.git)

      expect(mockSessionCopyFrom).toHaveBeenCalledWith(readOnlyStack.fileStore)

      expect(req.otomi).toBe(sessionStack)
      expect(next).toHaveBeenCalledTimes(1)
    })

    describe('socket authentication', () => {
      type SocketMiddleware = Parameters<Server['use']>[0]
      let authenticate: SocketMiddleware

      const createSocket = (token?: unknown, authorization?: string): Socket =>
        ({
          id: 'socket-id',
          handshake: {
            auth: token === undefined ? {} : { token },
            headers: { authorization },
          },
          data: {},
          on: jest.fn(),
          emit: jest.fn(),
          broadcast: { emit: jest.fn() },
        }) as unknown as Socket

      beforeEach(() => {
        sessionModule.sessionMiddleware({} as http.Server)
        ;[[authenticate]] = mockIoUse.mock.calls
        mockVerifyJwt.mockResolvedValue({ email: 'verified@example.com' })
        mockBeginSocketAuthAttempt.mockResolvedValue(mockCompleteAuthAttempt)
        mockCompleteAuthAttempt.mockResolvedValue(undefined)
      })

      it.each([undefined, '', '   ', 123, {}, ['token']])(
        'rejects a missing or malformed token (%p)',
        async (token) => {
          const next = jest.fn()

          await authenticate(createSocket(token), next)

          expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Unauthorized' }))
          expect(mockVerifyJwt).not.toHaveBeenCalled()
          expect(mockCompleteAuthAttempt).not.toHaveBeenCalled()
        },
      )

      it.each(['valid-token', 'Bearer valid-token'])('verifies handshake auth.token (%s)', async (token) => {
        const socket = createSocket(token)
        const next = jest.fn()

        await authenticate(socket, next)

        expect(mockVerifyJwt).toHaveBeenCalledWith(token)
        expect(socket.data.email).toBe('verified@example.com')
        expect(mockCompleteAuthAttempt).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenCalledWith()
      })

      it('verifies the Authorization header when auth.token is absent', async () => {
        const next = jest.fn()

        await authenticate(createSocket(undefined, 'Bearer header-token'), next)

        expect(mockVerifyJwt).toHaveBeenCalledWith('Bearer header-token')
        expect(next).toHaveBeenCalledWith()
      })

      it('prefers auth.token over the Authorization header', async () => {
        await authenticate(createSocket('auth-token', 'Bearer header-token'), jest.fn())

        expect(mockVerifyJwt).toHaveBeenCalledWith('auth-token')
      })

      it.each([
        'invalid signature',
        'expired token',
        'wrong issuer',
        'wrong audience',
        'missing claims',
        'JWKS unavailable',
      ])('rejects verification failures (%s)', async (message) => {
        mockVerifyJwt.mockRejectedValueOnce(new Error(message))
        const socket = createSocket('invalid-token')
        const next = jest.fn()

        await authenticate(socket, next)

        expect(next).toHaveBeenCalledTimes(1)
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Unauthorized' }))
        expect(socket.data.email).toBeUndefined()
        expect(mockCompleteAuthAttempt).not.toHaveBeenCalled()
      })

      it('rejects rate-limited connections before verifying JWTs', async () => {
        const { SocketAuthRateLimitError } = await import('./rate-limit')
        const error = new SocketAuthRateLimitError(60)
        mockBeginSocketAuthAttempt.mockRejectedValueOnce(error)
        const next = jest.fn()

        await authenticate(createSocket('valid-token'), next)

        expect(next).toHaveBeenCalledWith(error)
        expect(mockVerifyJwt).not.toHaveBeenCalled()
        expect(mockCompleteAuthAttempt).not.toHaveBeenCalled()
      })

      it('uses the verified identity for user events', async () => {
        const socket = createSocket('valid-token')
        socket.handshake.auth.email = 'spoofed@example.com'
        await authenticate(socket, jest.fn())
        mockIoOf.mockReturnValue({ sockets: new Map([[socket.id, socket]]) })
        const [, onConnection] = mockIoOn.mock.calls.find(([event]) => event === 'connection')!

        onConnection(socket)

        expect(socket.emit).toHaveBeenCalledWith('users', [{ id: socket.id, email: 'verified@example.com' }])
        expect(socket.broadcast.emit).toHaveBeenCalledWith('user connected', {
          userID: socket.id,
          email: 'verified@example.com',
        })
      })
    })

    it('treats method names case-insensitively', async () => {
      const { req, next } = await runMiddleware('PaTcH')

      expect(mockUuidv4).toHaveBeenCalledTimes(1)
      expect(req.otomi).toBe(sessionStack)
      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  it('initializes the read-only stack only once', async () => {
    await sessionModule.getSessionStack()
    await sessionModule.getSessionStack()

    expect(mockOtomiStack).toHaveBeenCalledTimes(1)
    expect(mockReadOnlyInit).toHaveBeenCalledTimes(1)
  })

  it('does not create another stack when the same session ID already exists', async () => {
    mockUuidv4.mockReturnValue('shared-session-id')

    const firstRequest = await runMiddleware('PATCH')
    const secondRequest = await runMiddleware('PATCH')

    expect(firstRequest.req.otomi).toBe(sessionStack)
    expect(secondRequest.req.otomi).toBe(sessionStack)

    /*
     * One construction is for the read-only stack and one for the session.
     * The second PATCH reuses the existing session entry.
     */
    expect(mockOtomiStack).toHaveBeenCalledTimes(2)
    expect(mockSessionInitGitWorktree).toHaveBeenCalledTimes(1)
    expect(mockSessionCopyFrom).toHaveBeenCalledTimes(1)
    expect(secondRequest.next).toHaveBeenCalledTimes(1)
  })

  it('throws ApiLockedError for PATCH requests when the API is locked', async () => {
    await sessionModule.getSessionStack()
    readOnlyStack.locked = true

    const middleware = sessionModule.sessionMiddleware(undefined as unknown as http.Server)

    const req = createRequest('PATCH')
    const next = jest.fn()

    await expect(middleware(req as unknown as Request, createResponse(), next)).rejects.toHaveProperty(
      'constructor.name',
      'ApiLockedError',
    )

    expect(mockUuidv4).not.toHaveBeenCalled()
    expect(mockSessionInitGitWorktree).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  describe('cleanSession', () => {
    it('removes a session Git worktree', async () => {
      await sessionModule.getSessionStack()

      await sessionModule.setSessionStack('platform-admin@example.com', 'test-session-id')

      await sessionModule.cleanSession('test-session-id')

      expect(mockRemoveWorktree).toHaveBeenCalledWith('/tmp/otomi/values/test-session-id')
      expect(mockRemove).not.toHaveBeenCalled()
      expect(sessionModule.getEditors()).not.toContain('test-session-id')
    })

    it('falls back to removing the directory when Git cleanup fails', async () => {
      mockRemoveWorktree.mockRejectedValueOnce(new Error('failed to remove worktree'))

      await sessionModule.getSessionStack()

      await sessionModule.setSessionStack('platform-admin@example.com', 'test-session-id')

      await sessionModule.cleanSession('test-session-id')

      expect(mockRemoveWorktree).toHaveBeenCalledWith('/tmp/otomi/values/test-session-id')

      expect(mockRemove).toHaveBeenCalledWith('/tmp/otomi/values/test-session-id')

      expect(sessionModule.getEditors()).not.toContain('test-session-id')
    })

    it('removes an unknown session directory directly', async () => {
      await sessionModule.cleanSession('unknown-session-id')

      expect(mockRemoveWorktree).not.toHaveBeenCalled()
      expect(mockRemove).toHaveBeenCalledWith('/tmp/otomi/values/unknown-session-id')
    })
  })

  describe('cleanAllSessions', () => {
    it('removes the root directory and clears all sessions', async () => {
      await sessionModule.getSessionStack()

      await sessionModule.setSessionStack('platform-admin@example.com', 'test-session-id')

      expect(sessionModule.getEditors()).toContain('test-session-id')

      await sessionModule.cleanAllSessions()

      expect(mockRm).toHaveBeenCalledWith('/tmp/otomi/values', {
        recursive: true,
        force: true,
      })

      expect(sessionModule.getEditors()).toEqual([])
    })
  })
})
