/* eslint-disable @typescript-eslint/no-use-before-define */
import Debug from 'debug'
import { NextFunction, RequestHandler, Response } from 'express'
import 'express-async-errors'
import { remove } from 'fs-extra'
import http from 'http'
import { cloneDeep } from 'lodash'
import { join } from 'path'
import { Server } from 'socket.io'
import { ApiNotReadyError, DeployLockError } from 'src/error'
import { OpenApiRequestExt } from 'src/otomi-models'
import { default as OtomiStack, rootPath } from 'src/otomi-stack'
import { EDITOR_INACTIVITY_TIMEOUT, cleanEnv } from 'src/validators'
import { v4 as uuidv4 } from 'uuid'

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
let isProcessing = false
const requestQueue: Array<{
  req: OpenApiRequestExt
  res: Response
  next: NextFunction
}> = []
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
    sessions[sessionId] = new OtomiStack(editor, sessionId, readOnlyStack.db)
    // init repo without inflating db from files as its slow and we just need a copy of the db
    await sessions[sessionId].initRepo(true)
    sessions[sessionId].db = cloneDeep(readOnlyStack.db)
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
  delete sessions[sessionId]
  await remove(join(rootPath, sessionId))
}

let io: Server
export const getIo = () => io

const processQueue = async () => {
  if (isProcessing || requestQueue.length === 0) return
  isProcessing = true

  const request = requestQueue.shift()
  if (!request) return
  const { req, res, next } = request
  try {
    const { email } = req.user || {}
    const roStack = await getSessionStack()
    req.otomi = roStack

    if (['post', 'put', 'delete'].includes(req.method.toLowerCase())) {
      if (req.path === '/v1/cloudtty' || req.path === '/v1/workloadCatalog') next()
      else {
        const waitForUnlock = async (retries: number, delay: number): Promise<void> => {
          debug(`Waiting for deploy lock to be released`)
          let attempts = 0
          while (roStack.locked && attempts < retries) {
            attempts += 1
            await new Promise((resolve) => setTimeout(resolve, attempts * delay))
          }
          if (roStack.locked) throw new DeployLockError()
        }

        if (roStack.locked) await waitForUnlock(3, 5000)

        const sessionId = uuidv4() as string
        req.otomi = await setSessionStack(email, sessionId)
        next()
      }
    } else next()
  } catch (error) {
    res.status(500).send(error.message)
  } finally {
    isProcessing = false
    processQueue()
  }
}

// we use session middleware so we can give each user their own otomiStack
// with a snapshot of the db, the moment they start touching data
export function sessionMiddleware(server: http.Server): RequestHandler {
  // socket setup
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
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return async function nextHandler(req: OpenApiRequestExt, res: Response, next: NextFunction): Promise<any> {
    if (!env.isTest && (!readOnlyStack || !readOnlyStack.isLoaded)) throw new ApiNotReadyError()
    requestQueue.push({ req, res, next })
    await processQueue()
  }
}
