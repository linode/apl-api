import type { NextFunction, Request, Response } from 'express'
import http from 'http'
import request from 'supertest'
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
const mockEngineUse = jest.fn()

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

jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    use: mockIoUse,
    on: mockIoOn,
    of: mockIoOf,
    engine: { use: mockEngineUse, on: jest.fn() },
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

  it.each(['/ws', '/ws/', '/ws/other'])('does not create an editor session for POST %s', async (path) => {
    const middleware = sessionModule.sessionMiddleware(undefined as unknown as http.Server)
    const req = { ...createRequest('POST'), path }
    const res = { sendStatus: jest.fn() } as unknown as Response
    const next = jest.fn()

    await middleware(req as unknown as Request, res, next)

    expect(res.sendStatus).toHaveBeenCalledWith(404)
    expect(mockOtomiStack).not.toHaveBeenCalled()
    expect(mockUuidv4).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  describe('transport authentication', () => {
    let server: http.Server

    beforeEach(async () => {
      const { Server: RealServer } = jest.requireActual<typeof import('socket.io')>('socket.io')
      const { Server: MockServer } = await import('socket.io')
      jest.mocked(MockServer).mockImplementationOnce((httpServer) => new RealServer(httpServer, { path: '/ws' }))
      server = http.createServer()
      sessionModule.sessionMiddleware(server)
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
      mockVerifyJwt.mockResolvedValue({ email: 'verified@example.com' })
    })

    afterEach(async () => {
      await new Promise<void>((resolve) => sessionModule.getIo().close(() => resolve()))
    })

    const websocketUrl = (sid?: string): string => {
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('Expected an HTTP listening address')
      return `ws://127.0.0.1:${address.port}/ws/?EIO=4&transport=websocket${sid ? `&sid=${sid}` : ''}`
    }

    it.each([undefined, 'unknown-session'])('rejects unauthenticated WebSockets or forged sids (%s)', async (sid) => {
      await new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(websocketUrl(sid))
        socket.addEventListener('open', () => {
          socket.close()
          reject(new Error('Unauthenticated WebSocket was accepted'))
        })
        socket.addEventListener('error', () => resolve())
      })

      expect(sessionModule.getIo().engine.clientsCount).toBe(0)
      expect(mockVerifyJwt).not.toHaveBeenCalled()
    })

    it('allows browser WebSocket upgrades of authenticated polling sessions', async () => {
      const token = 'upgrade-test-token'
      const res = await request(server).get('/ws/?EIO=4&transport=polling').set('Authorization', token)
      const { sid } = JSON.parse(res.text.substring(1))
      mockVerifyJwt.mockClear()

      await new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(websocketUrl(sid))
        socket.addEventListener('open', () => socket.send('2probe'))
        socket.addEventListener('error', () => reject(new Error('Authenticated upgrade was rejected')))
        socket.addEventListener('message', ({ data }) => {
          if (data !== '3probe') return reject(new Error('Unexpected upgrade probe response'))
          socket.send('5')
          socket.close()
        })
        socket.addEventListener('close', () => resolve())
      })

      expect(mockVerifyJwt).not.toHaveBeenCalled()
    })

    it('rejects upgrades of closed polling sessions', async () => {
      const token = 'upgrade-test-token'
      const res = await request(server).get('/ws/?EIO=4&transport=polling').set('Authorization', token)
      const { sid } = JSON.parse(res.text.substring(1))
      await request(server)
        .post(`/ws/?EIO=4&transport=polling&sid=${sid}`)
        .set('Authorization', token)
        .send('1')
        .expect(200)
      mockVerifyJwt.mockClear()

      await new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(websocketUrl(sid))
        socket.addEventListener('open', () => {
          socket.close()
          reject(new Error('Closed session was accepted'))
        })
        socket.addEventListener('error', () => resolve())
      })

      expect(mockVerifyJwt).not.toHaveBeenCalled()
    })

    it.each(['get', 'post'] as const)(
      'rejects an unauthenticated initial %s without allocating a session',
      async (method) => {
        await request(server)[method]('/ws/?EIO=4&transport=polling').expect(401, { message: 'Unauthorized' })

        expect(sessionModule.getIo().engine.clientsCount).toBe(0)
        expect(mockVerifyJwt).not.toHaveBeenCalled()
      },
    )

    it.each(['expired token', 'invalid signature', 'wrong issuer', 'wrong audience'])(
      'rejects invalid handshake credentials (%s)',
      async (message) => {
        mockVerifyJwt.mockRejectedValueOnce(new Error(message))

        await request(server)
          .get('/ws/?EIO=4&transport=polling')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401, { message: 'Unauthorized' })

        expect(sessionModule.getIo().engine.clientsCount).toBe(0)
      },
    )

    it('creates a transport session only after JWT verification', async () => {
      const res = await request(server)
        .get('/ws/?EIO=4&transport=polling')
        .set('Authorization', 'Bearer valid-token')
        .expect(200)

      expect(JSON.parse(res.text.substring(1))).toHaveProperty('sid')
      expect(sessionModule.getIo().engine.clientsCount).toBe(1)
      expect(mockVerifyJwt).toHaveBeenCalledWith('Bearer valid-token')
    })

    it('requires authentication on subsequent polling POSTs even with a valid sid', async () => {
      const res = await request(server).get('/ws/?EIO=4&transport=polling').set('Authorization', 'Bearer valid-token')
      const { sid } = JSON.parse(res.text.substring(1))
      mockVerifyJwt.mockClear()

      await request(server)
        .post(`/ws/?EIO=4&transport=polling&sid=${sid}`)
        .send('40')
        .expect(401, { message: 'Unauthorized' })

      expect(mockVerifyJwt).not.toHaveBeenCalled()
      expect(sessionModule.getIo().of('/').sockets.size).toBe(0)
    })

    it('accepts an authenticated polling POST and connects the socket', async () => {
      const res = await request(server).get('/ws/?EIO=4&transport=polling').set('Authorization', 'Bearer valid-token')
      const { sid } = JSON.parse(res.text.substring(1))

      await request(server)
        .post(`/ws/?EIO=4&transport=polling&sid=${sid}`)
        .set('Authorization', 'Bearer valid-token')
        .send('40')
        .expect(200)
      const poll = await request(server)
        .get(`/ws/?EIO=4&transport=polling&sid=${sid}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200)

      expect(poll.text).toContain('verified@example.com')
      expect(sessionModule.getIo().of('/').sockets.size).toBe(1)
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
      })

      it.each([undefined, '', '   ', 123, {}, ['token']])(
        'rejects a missing or malformed token (%p)',
        async (token) => {
          const next = jest.fn()

          await authenticate(createSocket(token), next)

          expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Unauthorized' }))
          expect(mockVerifyJwt).not.toHaveBeenCalled()
        },
      )

      it.each(['valid-token', 'Bearer valid-token'])('verifies handshake auth.token (%s)', async (token) => {
        const socket = createSocket(token)
        const next = jest.fn()

        await authenticate(socket, next)

        expect(mockVerifyJwt).toHaveBeenCalledWith(token)
        expect(socket.data.email).toBe('verified@example.com')
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
