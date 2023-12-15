/* eslint-disable @typescript-eslint/no-use-before-define */
import Debug from 'debug'
import { RequestHandler } from 'express'
import 'express-async-errors'
import { emptyDir } from 'fs-extra'
import http from 'http'
import { cloneDeep } from 'lodash'
import { join } from 'path'
import { Server } from 'socket.io'
import { ApiNotReadyError } from 'src/error'
import { checkLicense } from 'src/license-utils'
import { OpenApiRequestExt } from 'src/otomi-models'
import { default as OtomiStack, rootPath } from 'src/otomi-stack'
import { myStatus } from 'src/utils/statusUtils'
import { EDITOR_INACTIVITY_TIMEOUT, cleanEnv } from 'src/validators'

const debug = Debug('otomi:session')
const env = cleanEnv({
  EDITOR_INACTIVITY_TIMEOUT,
})

export type DbMessage = {
  state: 'clean' | 'corrupt' | 'dirty'
  editor: string
  reason: 'deploy' | 'revert' | 'restore' | 'conflict' | 'started' | 'restored'
  sha?: string
}

// instantiate read-only version of the stack
let readOnlyStack: OtomiStack
let sessions: Record<string, OtomiStack> = {}
let intervalId: number
// handler to get the correct stack for the user: if never touched any data give the main otomiStack
export const getSessionStack = async (editor?: string): Promise<OtomiStack> => {
  if (!readOnlyStack) {
    readOnlyStack = new OtomiStack()
    await readOnlyStack.init()
  }
  if (!editor || !sessions[editor]) return readOnlyStack
  return sessions[editor]
}
export const setSessionStack = async (editor: string): Promise<void> => {
  if (env.isTest) return
  if (!sessions[editor]) {
    debug(`Creating editor session for user ${editor}`)
    sessions[editor] = new OtomiStack(editor, readOnlyStack.db)
    // init repo without inflating db from files as its slow and we just need a copy of the db
    await sessions[editor].initRepo(true)
    sessions[editor].db = cloneDeep(readOnlyStack.db)
    // let users know someone started editing
    const msg: DbMessage = { state: 'dirty', editor, reason: 'started' }
    io.emit('db', msg)
  } else sessions[editor].editor = editor
}

export const getEditors = () => Object.keys(sessions)

export const cleanAllSessions = (): void => {
  debug(`Cleaning all editor sessions`)
  sessions = {}
  // @ts-ignore
  readOnlyStack = undefined
}

export const cleanSession = async (editor: string, sendMsg = true): Promise<void> => {
  debug(`Cleaning editor session for ${editor}`)
  const sha = await readOnlyStack.repo.getCommitSha()
  delete sessions[editor]
  await emptyDir(join(rootPath, editor))
  if (!sendMsg) return
  const msg: DbMessage = { state: 'clean', editor, sha, reason: 'revert' }
  io.emit('db', msg)
}

let io: Server
export const getIo = () => io

// we use session middleware so we can give each user their own otomiStack
// with a snapshot of the db, the moment they start touching data
export function sessionMiddleware(server: http.Server): RequestHandler {
  const timeout: Record<string, NodeJS.Timeout | undefined> = {}
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
    if (intervalId) {
      console.log('INTERVAL RESTARTED!', intervalId)
      clearInterval(intervalId)
    }
    intervalId = myStatus(readOnlyStack, intervalId)
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return async function nextHandler(req: OpenApiRequestExt, res, next): Promise<any> {
    if (!env.isTest && (!readOnlyStack || !readOnlyStack.isLoaded)) throw new ApiNotReadyError()
    const { email } = req.user || {}
    const sessionStack = await getSessionStack(email)
    // eslint-disable-next-line no-param-reassign
    req.otomi = sessionStack
    const { editor } = sessionStack
    // remove session after x days to avoid mem leaks
    const interval = env.EDITOR_INACTIVITY_TIMEOUT * 24 * 60 * 60 * 1000
    // clear when active
    if (timeout[email]) {
      clearInterval(timeout[email])
      timeout[email] = undefined
    }

    if (['post', 'put', 'delete'].includes(req.method.toLowerCase())) {
      const [path] = req.originalUrl.split('/').slice(-1)
      if (['teams', 'services', 'workloads', 'projects'].includes(path))
        checkLicense(req.method.toLowerCase(), path, sessionStack)
      // in the cloudtty or workloadCatalog endpoint(s), don't need to create a session
      if (req.path === '/v1/cloudtty' || req.path === '/v1/workloadCatalog' || req.path === '/v1/status') return next()
      // manipulating data and no editor session yet? create one
      if (!editor) {
        // bootstrap session stack for user
        await setSessionStack(email)
        // eslint-disable-next-line no-param-reassign
        req.otomi = await getSessionStack(email)
        timeout[email] = setTimeout(() => {
          sessionStack.doRevert()
        }, interval)
        return next()
      }
    }
    return next()
  }
}
