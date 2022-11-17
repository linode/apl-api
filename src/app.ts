/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-use-before-define */
import $parser from '@apidevtools/json-schema-ref-parser'
import { json } from 'body-parser'
import { pascalCase } from 'change-case'
import cors from 'cors'
import Debug from 'debug'
import express, { request } from 'express'
import 'express-async-errors'
import { initialize } from 'express-openapi'
import { removeSync } from 'fs-extra'
import { Server } from 'http'
import httpSignature from 'http-signature'
import { createLightship } from 'lightship'
import logger from 'morgan'
import path from 'path'
import { default as Authz } from 'src/authz'
import {
  authzMiddleware,
  errorMiddleware,
  getIo,
  getSessionStack,
  jwtMiddleware,
  sessionMiddleware,
} from 'src/middleware'
import { setMockIdx } from 'src/mocks'
import { OpenAPIDoc, OpenApiRequestExt, Schema } from 'src/otomi-models'
import { default as OtomiStack } from 'src/otomi-stack'
import { extract, getPaths, getValuesSchema } from 'src/utils'
import { cleanEnv, DRONE_WEBHOOK_SECRET } from 'src/validators'
import swaggerUi from 'swagger-ui-express'

const env = cleanEnv({
  DRONE_WEBHOOK_SECRET,
})

const debug = Debug('otomi:app')
debug('NODE_ENV: ', process.env.NODE_ENV)

type OtomiSpec = {
  spec: OpenAPIDoc
  secretPaths: string[]
}

let otomiSpec: OtomiSpec
export const loadSpec = async (): Promise<void> => {
  const openApiPath = path.resolve(__dirname, 'generated-schema.json')
  debug(`Loading api spec from: ${openApiPath}`)
  const spec = (await $parser.parse(openApiPath)) as OpenAPIDoc
  const valuesSchema = await getValuesSchema()
  const secrets = extract(valuesSchema, (o, i) => i === 'x-secret')
  const secretPaths = getPaths(secrets)
  otomiSpec = { spec, secretPaths }
}
export const getSpec = (): OtomiSpec => {
  return otomiSpec
}
export const getAppSchema = (appId: string): Schema => {
  return getSpec().spec.components.schemas[`App${pascalCase(appId)}`]
}

export const getAppList = (): string[] => {
  const appsSchema = getAppSchema('List')
  return appsSchema.enum as string[]
}

export async function initApp(inOtomiStack?: OtomiStack | undefined) {
  const lightship = createLightship()
  const app = express()
  const apiRoutesPath = path.resolve(__dirname, 'api')
  await loadSpec()
  // instantiate read-only version of the db
  const mainStack = inOtomiStack || (await getSessionStack())
  const authz = new Authz(otomiSpec.spec)

  app.use(logger('dev'))
  app.use(cors())
  app.use(json())
  app.use(jwtMiddleware())
  if (env.isDev) {
    app.all('/mock/:idx', (req, res, next) => {
      const { idx } = req.params
      setMockIdx(idx)
      res.send('ok')
    })
  }
  app.all('/drone', async (req, res, next) => {
    const parsed = httpSignature.parseRequest(req, {
      algorithm: 'hmac-sha256',
    })
    if (!httpSignature.verifyHMAC(parsed, env.DRONE_WEBHOOK_SECRET)) return res.status(401).send()
    const event = req.headers['x-drone-event']
    res.send('ok')
    if (event !== 'build') return
    const io = getIo()
    // emit now to let others know, before doing anything else
    if (io) io.emit('drone', req.body)
    // deployment might have changed data, so reload
    const { build } = request.body || {}
    if (!build) return
    const { status } = build
    if (status === 'success') {
      const stack = await getSessionStack()
      debug('Drone deployed, root pull')
      await stack.repo.pull()
    }
  })
  let server: Server | undefined
  if (!inOtomiStack) {
    // initialize full server
    const { PORT = 8080 } = process.env
    server = app
      .listen(PORT, async () => {
        debug(`Listening on :::${PORT}`)
        lightship.signalReady()
        // Clone repo after the application is ready to avoid Pod NotReady phenomenon, and thus infinite Pod crash loopback
        ;(await getSessionStack()).initRepo()
      })
      .on('error', (e) => {
        console.error(e)
        lightship.shutdown()
      })
    lightship.registerShutdownHandler(() => {
      ;(server as Server).close()
    })
  }
  // and register session middleware
  app.use(sessionMiddleware(server as Server))

  // now we can initialize the more specific routes
  initialize({
    // @ts-ignore
    apiDoc: {
      ...otomiSpec.spec,
      'x-express-openapi-additional-middleware': [authzMiddleware(authz)],
    },
    app,
    dependencies: {
      authz,
    },
    enableObjectCoercion: true,
    paths: apiRoutesPath,
    errorMiddleware,
    securityHandlers: {
      groupAuthz: (req: OpenApiRequestExt): boolean => {
        return !!req.user
      },
    },
    routesGlob: '**/*.{ts,js}',
    routesIndexFileRegExp: /(?:index)?\.[tj]s$/,
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(otomiSpec.spec))
  return app
}

if (!env.isTest) {
  initApp().catch((e) => {
    debug(e)
    process.exit(1)
  })
}

process.on('exit', () => {
  if (process.env.NODE_ENV === 'development') removeSync('/tmp/otomi')
})
