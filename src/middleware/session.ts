/* eslint-disable @typescript-eslint/no-use-before-define */
import Debug from 'debug'
import { NextFunction, RequestHandler } from 'express'
import 'express-async-errors'
import http from 'http'
import { cloneDeep, map } from 'lodash'
import { Server } from 'socket.io'
import { OpenApiRequestExt } from 'src/otomi-models'
import { default as OtomiStack } from 'src/otomi-stack'
import { cleanEnv, EDITOR_INACTIVITY_TIMEOUT } from 'src/validators'

const debug = Debug('otomi:session')
const env = cleanEnv({
  EDITOR_INACTIVITY_TIMEOUT,
})

// instantiate read-only version of the stack
const readOnlyStack = new OtomiStack()
const sessions: Record<string, OtomiStack> = {}
// handler to get the correct stack for the user: if never touched any data give the main otomiStack
export const getSessionStack = async (editor?: string): Promise<OtomiStack> => {
  if (!readOnlyStack.getCore()) await readOnlyStack.init()
  if (!editor || !sessions[editor]) return readOnlyStack
  return sessions[editor]
}
export const setSessionStack = async (editor: string, clean = false): Promise<void> => {
  if (env.isTest) return
  if (sessions[editor] && clean) {
    debug(`Cleaning editor session for user ${editor}`)
    delete sessions[editor]
    return
  }
  if (!sessions[editor]) {
    debug(`Creating editor session for user ${editor}`)
    sessions[editor] = new OtomiStack(editor, readOnlyStack.db)
    // init repo without inflating db from files as its slow and we just need a copy of the db
    await sessions[editor].initRepo(true)
    sessions[editor].db = cloneDeep(readOnlyStack.db)
  } else sessions[editor].editor = editor
}
export const cleanSessions = async () => {
  debug(`Cleaning all editor sessions`)
  return Promise.all(
    map(sessions, async (sess, idx) => {
      // await remove(`/tmp/otomi/${idx}`)
      delete sessions[idx]
      return Promise.resolve()
    }),
  )
}
let io: Server
export const getIo = () => io

// we use session middleware so we can give each user their own otomiStack
// with a snapshot of the db, the moment they start touching data
export function sessionMiddleware(server?: http.Server): Record<string, RequestHandler> {
  const timeout = {}
  // for tests we skip io setup
  if (server) {
    // socket setup
    io = new Server(server, { path: '/ws' })
    io.on('connection', (socket: any) => {
      socket.on('error', console.error)
      const users: any[] = []
      for (const [id, { email }] of io.of('/').sockets as any) {
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
  return {
    async beforeHandler(req: OpenApiRequestExt, res, next: NextFunction): Promise<any> {
      const { email } = req.user || {}
      const sessionStack = await getSessionStack(email)
      // eslint-disable-next-line no-param-reassign
      req.otomi = sessionStack
      const { editor } = sessionStack
      // early exit for tests as below does not concern them
      if (env.isTest && !editor) return next()
      // remove session after x days to avoid mem leaks
      const interval = env.EDITOR_INACTIVITY_TIMEOUT * 24 * 60 * 60 * 1000
      // clear when active
      if (timeout[email]) {
        clearInterval(timeout[email])
        timeout[email] = undefined
      }
      if (['post', 'put'].includes(req.method.toLowerCase())) {
        // manipulating data and no editor session yet? create one
        if (!editor) {
          // let users know someone started editing
          if (io) io.emit('db', { state: 'dirty', editor: email })
          // and bootstrap session stack for user
          await setSessionStack(email)
          // eslint-disable-next-line no-param-reassign
          req.otomi = await getSessionStack(email)
          timeout[email] = setTimeout(() => {
            sessionStack.triggerRevert()
            if (io) io.emit('db', { state: 'clean', editor: sessionStack.editor, reason: 'timeout' })
          }, interval)
        }
        return next()
      }
      // clean slate upon deploy and let others know
      const path = req.path.replace('/v1/', '')
      if (['deploy', 'revert'].includes(path)) {
        if (io) io.emit('db', { state: 'clean', editor, reason: path })
        try {
          next()
        } catch (e) {
          if (io) io.emit('db', { state: 'clean', editor: sessionStack.editor, reason: 'corrupt' })
        }
        return
      }
      next()
    },
    afterHandler(req: OpenApiRequestExt, res, next: NextFunction): any {
      const { editor } = req.otomi
      // early exit for tests as below does not concern them
      if (env.isTest && !editor) return next()
      // clean slate upon deploy and let others know
      const path = req.path.replace('/v1/', '')
      if (['deploy', 'revert'].includes(path) && res.statusCode === 200)
        if (io) io.emit('db', { state: 'clean', editor, reason: path })
      next()
    },
  }
}
