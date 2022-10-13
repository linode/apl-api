import Debug from 'debug'
import { createLightship } from 'lightship'
import { Server } from 'socket.io'
import { OpenApiRequestExt } from './otomi-models'
import { default as OtomiStack } from './otomi-stack'
import initApp from './server'

const debug = Debug('otomi:app')

debug('NODE_ENV: ', process.env.NODE_ENV)

const otomiStack = new OtomiStack()

let server
let io

async function initServer() {
  if (server) return server
  const lightship = createLightship()
  const app = await initApp(otomiStack)
  const { PORT = 8080 } = process.env
  server = app
    .listen(PORT, () => {
      debug(`Listening on port: http://127.0.0.1:${PORT}`)
      lightship.signalReady()
      // Clone repo after the application is ready to avoid Pod NotReady phenomenon, and thus infinite Pod crash loopback
      otomiStack.init()
    })
    .on('error', () => {
      lightship.shutdown()
    })
  lightship.registerShutdownHandler(() => {
    server.close()
  })
  io = new Server(server, { path: '/ws' })

  io.on('connection', (socket) => {
    socket.on('error', console.error)
  })
  // we use a catch all route for the api so we can only allow one user to edit the db
  // the first user to touch the data is the one and the rest has to wait
  app.all('*', (req: OpenApiRequestExt, res, next) => {
    const {
      user: { email },
    } = req
    const {
      db: { editor },
    } = otomiStack
    if (['post', 'put'].includes(req.method.toLowerCase())) {
      if (editor && editor !== email) return next('Another user has already started editing values!')
      next()
      // we know we are mutating data, so set the editor (user email) when operation was successful
      // eslint-disable-next-line no-param-reassign
      otomiStack.db.editor = req.user.email
      io.emit('db', { state: this.dirty ? 'dirty' : 'clean', editor: otomiStack.db.editor })
      return
    }
    next()
  })
}

export const getServer = async () => Promise.resolve(server)
export const getIo = async () => Promise.resolve(io || {})

initServer().catch((e) => {
  debug(e)
  process.exit(1)
})
