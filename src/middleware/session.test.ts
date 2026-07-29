import type { NextFunction, Request, Response } from 'express'
import type http from 'http'
import type { OpenApiRequestExt } from 'src/otomi-models'

const mockRemove = jest.fn()
const mockRm = jest.fn()
const mockUuidv4 = jest.fn()
const mockSetApiStatusInConfigMap = jest.fn()

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

jest.mock('socket.io', () => ({
  Server: jest.fn(),
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
