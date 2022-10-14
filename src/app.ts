/* eslint-disable @typescript-eslint/no-use-before-define */
import { json } from 'body-parser'
import cors from 'cors'
import Debug from 'debug'
import express from 'express'
import 'express-async-errors'
import { initialize } from 'express-openapi'
import { createLightship } from 'lightship'
import logger from 'morgan'
import { SecurityHandlers } from 'openapi-security-handler'
import path from 'path'
import { Server } from 'socket.io'
import swaggerUi from 'swagger-ui-express'
import { default as Authz } from './authz'
import { authzMiddleware, errorMiddleware, isUserAuthenticated, jwtMiddleware } from './middleware'
import { setMockIdx } from './mocks'
import { OpenAPIDoc, OpenApiRequestExt } from './otomi-models'
import { default as OtomiStack, loadOpenApisSpec } from './otomi-stack'

const debug = Debug('otomi:app')

debug('NODE_ENV: ', process.env.NODE_ENV)

export async function initApp(inOtomiStack?: OtomiStack | undefined) {
  const lightship = createLightship()
  const app = express()
  const apiRoutesPath = path.resolve(__dirname, 'api')
  const [spec] = await loadOpenApisSpec()
  const otomiStack = inOtomiStack || new OtomiStack()

  otomiStack.setSpec(spec)
  const authz = new Authz(spec as any as OpenAPIDoc)

  app.use(logger('dev'))
  app.use(cors())
  app.use(json())
  app.use(jwtMiddleware(otomiStack))

  function getSecurityHandlers(): SecurityHandlers {
    const securityHandlers = {
      groupAuthz: (req): boolean => {
        return isUserAuthenticated(req)
      },
    }
    return securityHandlers
  }
  app.all('/mock/:idx', (req, res, next) => {
    const { idx } = req.params
    setMockIdx(idx)
    res.send('ok')
  })
  if (!inOtomiStack) {
    // initialize full server
    const { PORT = 8080 } = process.env
    const server = app
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
    // socket setup
    const io = new Server(server, { path: '/ws' })
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
    // we use a catch all route for the api so we can only allow one user to edit the db
    // the first user to touch the data is the "editor" and the rest has to wait
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
        // we know a user is mutating data, so set the editor (user email) when operation was successful
        otomiStack.db.editor = req.user.email
        // and let others know they can only get read-only access
        io.emit('db', { state: 'dirty', editor: otomiStack.db.editor })
        return
      }
      next()
      // if editor was removed let others know that the slate is clean
      if (['deploy', 'revert'].includes(req.path.replace('/v1/', ''))) {
        io.emit('db', { state: 'clean', editor: otomiStack.db.editor })
        otomiStack.db.editor = undefined
      }
    })
  }
  // now we can initialize the more specific routes
  initialize({
    // @ts-ignore
    apiDoc: {
      ...spec,
      'x-express-openapi-additional-middleware': [authzMiddleware(authz, otomiStack)],
    },
    app,
    dependencies: {
      otomi: otomiStack,
      authz,
    },
    enableObjectCoercion: true,
    paths: apiRoutesPath,
    errorMiddleware,
    securityHandlers: getSecurityHandlers(),
    routesGlob: '**/*.{ts,js}',
    routesIndexFileRegExp: /(?:index)?\.[tj]s$/,
  })

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec))
  return app
}

initApp().catch((e) => {
  debug(e)
  process.exit(1)
})
