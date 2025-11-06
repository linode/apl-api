import Debug from 'debug'
import { RequestHandler } from 'express'
import { remove } from 'fs-extra'
import http from 'http'
import { cloneDeep } from 'lodash'
import { join } from 'path'
import { Server } from 'socket.io'
import { ApiNotReadyError } from 'src/error'
import { OpenApiRequestExt } from 'src/otomi-models'
import { default as OtomiStack, rootPath } from 'src/otomi-stack'
import { cleanEnv, EDITOR_INACTIVITY_TIMEOUT } from 'src/validators'
import { v4 as uuidv4 } from 'uuid'
import { getSanitizedErrorMessage } from '../utils'

const debug = Debug('otomi:session')
const env = cleanEnv({
  EDITOR_INACTIVITY_TIMEOUT,
})

export type DbMessage = {
  state: 'clean' | 'corrupt'
  editor: string
  reason: 'deploy' | 'revert' | 'conflict' | 'restored'
  sha?: string
}

// instantiate read-only version of the stack
let readOnlyStack: OtomiStack
let sessions: Record<string, OtomiStack> = {}
// handler to get the correct stack for the user: if never touched any data give the main otomiStack
export const getSessionStack = async (sessionId?: string): Promise<OtomiStack> => {
  if (!readOnlyStack) {
    readOnlyStack = new OtomiStack()
    await readOnlyStack.init()
  }
  if (!sessionId || !sessions[sessionId]) return readOnlyStack
  return sessions[sessionId]
}
export const setSessionStack = async (editor: string, sessionId: string): Promise<OtomiStack> => {
  if (env.isTest) return readOnlyStack
  if (!sessions[sessionId]) {
    debug(`Creating session ${sessionId} for user ${editor}`)
    sessions[sessionId] = new OtomiStack(editor, sessionId)
    await sessions[sessionId].initGitWorktree(readOnlyStack.git)
    sessions[sessionId].repoService = cloneDeep(readOnlyStack.repoService)
  } else sessions[sessionId].sessionId = sessionId
  return sessions[sessionId]
}

export const getEditors = () => Object.keys(sessions)

export const cleanAllSessions = (): void => {
  debug(`Cleaning all editor sessions`)
  sessions = {}
  // @ts-ignore
  readOnlyStack = undefined
}

export const cleanSession = async (sessionId: string): Promise<void> => {
  debug(`Cleaning session ${sessionId}`)
  const session = sessions[sessionId]
  const worktreePath = join(rootPath, sessionId)
  if (session?.git) {
    try {
      await readOnlyStack.git.removeWorktree(worktreePath)
    } catch (error) {
      const errorMessage = getSanitizedErrorMessage(error)
      debug(`Error removing worktree for session ${sessionId}: ${errorMessage}`)
      await remove(worktreePath)
    }
  } else {
    await remove(worktreePath)
  }
  delete sessions[sessionId]
}

let io: Server
export const getIo = () => io

// we use session middleware so we can give each user their own otomiStack
// with a snapshot of the db, the moment they start touching data
export function sessionMiddleware(server: http.Server): RequestHandler {
  // socket setup - only create Socket.IO if we have a server and not in tests
  if (!env.isTest && server) {
    io = new Server(server, { path: '/ws' })
    io.on('connection', (socket: any) => {
      socket.on('error', console.error)
      const users: any[] = []
      for (const [id, { email }] of io.of('/').sockets as Map<string, any>) {
        users.push({
          id,
          email,
        })
      }
      socket.emit('users', users)
      // notify existing users
      socket.broadcast.emit('user connected', {
        userID: socket.id,
        email: socket.email,
      })
    })
  }

  return async function nextHandler(req: OpenApiRequestExt, res, next): Promise<any> {
    if (!env.isTest && (!readOnlyStack || !readOnlyStack.isLoaded)) throw new ApiNotReadyError()
    const { email } = req.user || {}
    const roStack = await getSessionStack()
    // eslint-disable-next-line no-param-reassign
    req.otomi = roStack

    if (['post', 'put', 'delete'].includes(req.method.toLowerCase())) {
      // in the workloadCatalog endpoint(s), don't need to create a session
      if (req.path === '/v1/workloadCatalog' || req.path === '/v1/createWorkloadCatalog') return next()

      // bootstrap session stack with unique sessionId to manipulate data
      const sessionId = uuidv4() as string
      // eslint-disable-next-line no-param-reassign
      req.otomi = await setSessionStack(email, sessionId)
      return next()
    }
    return next()
  }
}
