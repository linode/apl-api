import $parser from '@apidevtools/json-schema-ref-parser'
import cors from 'cors'
import Debug from 'debug'
import express from 'express'
import 'express-async-errors'
import * as OpenApiValidator from 'express-openapi-validator'
import { Server } from 'http'
import { createLightship } from 'lightship'
import logger from 'morgan'
import path from 'path'
import { CleanOptions } from 'simple-git'
import { default as Authz } from 'src/authz'
import {
  authzMiddleware,
  errorMiddleware,
  getIo,
  getSessionStack,
  groupAuthzSecurityHandler,
  jwtMiddleware,
  sessionMiddleware,
} from 'src/middleware'
import { setMockIdx } from 'src/mocks'
import { AplResponseObject, OpenAPIDoc, OpenApiRequestExt, Schema } from 'src/otomi-models'
import { default as OtomiStack } from 'src/otomi-stack'
import { extract, getPaths, getValuesSchema } from 'src/utils'
import {
  CHECK_LATEST_COMMIT_INTERVAL,
  cleanEnv,
  DRONE_WEBHOOK_SECRET,
  EXPRESS_PAYLOAD_LIMIT,
  GIT_PASSWORD,
  GIT_PUSH_RETRIES,
  GIT_USER,
} from 'src/validators'
import swaggerUi from 'swagger-ui-express'
import giteaCheckLatest from './gitea/connect'
import { getBuildStatus, getSealedSecretStatus, getServiceStatus, getWorkloadStatus } from './k8s_operations'

const env = cleanEnv({
  DRONE_WEBHOOK_SECRET,
  CHECK_LATEST_COMMIT_INTERVAL,
  GIT_USER,
  GIT_PASSWORD,
  EXPRESS_PAYLOAD_LIMIT,
  GIT_PUSH_RETRIES,
})

const debug = Debug('otomi:app')
debug('NODE_ENV: ', process.env.NODE_ENV)

type OtomiSpec = {
  spec: OpenAPIDoc
  secretPaths: string[]
  valuesSchema: Record<string, any>
}

// get the latest commit from Gitea and checks it against the local values
const checkAgainstGitea = async () => {
  const encodedToken = Buffer.from(`${env.GIT_USER}:${env.GIT_PASSWORD}`).toString('base64')
  const otomiStack = await getSessionStack()
  const latestOtomiVersion = await giteaCheckLatest(encodedToken)
  // check the local version against the latest online version
  // if the latest online is newer it will be pulled locally
  if (latestOtomiVersion && latestOtomiVersion.data[0].sha !== otomiStack.git.commitSha) {
    debug('Local values differentiate from Git repository, retrieving latest values')
    // Remove all .dec files
    await otomiStack.git.git.clean([CleanOptions.FORCE, CleanOptions.IGNORED_ONLY, CleanOptions.RECURSIVE])
    const retries = env.GIT_PUSH_RETRIES
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await otomiStack.git.pull(false, true)
        break
      } catch (error) {
        if (attempt === retries) throw error
        debug(`Attempt ${attempt} of ${retries} failed. Retrying...`)
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }
    // inflate new db
    await otomiStack.loadValues()
  }
}

const resourceStatus = async (errorSet) => {
  const otomiStack = await getSessionStack()
  if (!otomiStack.isLoaded) {
    debug('Values are not loaded yet')
    return
  }
  const { cluster } = otomiStack.getSettings(['cluster'])
  const domainSuffix = cluster?.domainSuffix
  const resources: Record<string, AplResponseObject[]> = {
    workloads: otomiStack.repoService.getAllWorkloads(),
    builds: otomiStack.repoService.getAllBuilds(),
    services: otomiStack.repoService.getAllServices(),
    secrets: otomiStack.repoService.getAllSealedSecrets(),
  }
  const statusFunctions = {
    workloads: getWorkloadStatus,
    builds: getBuildStatus,
    services: getServiceStatus,
    secrets: getSealedSecretStatus,
  }
  const resourcesStatus = {}

  for (const resourceType in resources) {
    const promises = resources[resourceType].map(async (resource) => {
      const { name } = resource.metadata
      try {
        const res = await statusFunctions[resourceType](resource, domainSuffix)
        return { [name]: res }
      } catch (error) {
        const errorMessage = `${resourceType}-${name}-${error.message}`
        if (!errorSet.has(errorMessage)) {
          console.log(`Could not collect status data for ${resourceType} ${name} resource:`, error.message)
          errorSet.add(errorMessage)
        }
      }
    })
    resourcesStatus[resourceType] = Object.assign({}, ...(await Promise.all(promises)))
  }

  getIo().emit('status', resourcesStatus)
}

let otomiSpec: OtomiSpec
export const loadSpec = async (): Promise<void> => {
  const openApiPath = path.resolve(__dirname, 'generated-schema.json')
  debug(`Loading api spec from: ${openApiPath}`)
  const spec = (await $parser.parse(openApiPath)) as OpenAPIDoc
  const valuesSchema = await getValuesSchema()
  const secrets = extract(valuesSchema, (o, i) => i === 'x-secret')
  const secretPaths = getPaths(secrets)
  otomiSpec = { spec, secretPaths, valuesSchema }
}
export const getSpec = (): OtomiSpec => {
  return otomiSpec
}
export const getAppSchema = (appId: string): Schema => {
  let id: string = appId
  if (appId.startsWith('ingress-nginx')) id = 'ingress-nginx-platform'
  return getSpec().valuesSchema.properties.apps.properties[id]
}

export const getAppList = (): string[] => {
  const appsSchema = getSpec().spec.components.schemas['AppList']
  return appsSchema.enum as string[]
}

export async function initApp(inOtomiStack?: OtomiStack) {
  const lightship = createLightship()
  const app = express()
  const apiRoutesPath = path.resolve(__dirname, 'api')
  await loadSpec()
  const authz = new Authz(otomiSpec.spec)
  app.use(logger('dev'))
  app.use(cors())
  app.use(express.json({ limit: env.EXPRESS_PAYLOAD_LIMIT }))
  app.use(jwtMiddleware())
  if (env.isDev) {
    app.all('/mock/:idx', (req, res, next) => {
      const { idx } = req.params
      setMockIdx(idx)
      res.send('ok')
    })
  }
  // Transforms the interval to minutes
  if (!env.isTest) {
    const gitCheckVersionInterval = env.CHECK_LATEST_COMMIT_INTERVAL * 60 * 1000
    setInterval(async function () {
      await checkAgainstGitea()
    }, gitCheckVersionInterval)
  }
  let server: Server | undefined
  if (!inOtomiStack && !env.isTest) {
    // initialize full server
    const { PORT = 8080 } = process.env
    server = app
      .listen(PORT, async () => {
        debug(`Listening on :::${PORT}`)
        lightship.signalReady()
        // Clone repo after the application is ready to avoid Pod NotReady phenomenon, and thus infinite Pod crash loopback
        ;(await getSessionStack()).initGit()
      })
      .on('error', (e) => {
        console.error(e)
        lightship.shutdown()
      })
    lightship.registerShutdownHandler(() => {
      ;(server as Server).close()
    })
  }

  if (!env.isTest) {
    // emit resource status every 10 seconds
    const emitResourceStatusInterval = 10 * 1000
    const errorSet = new Set()
    setInterval(async function () {
      try {
        await resourceStatus(errorSet)
      } catch (e) {
        debug(e)
      }
    }, emitResourceStatusInterval)
  }
  app.use(sessionMiddleware(server as Server))

  // Store authz in app.locals so handlers can access it
  app.locals.authz = authz

  // Install OpenApiValidator middleware
  app.use(
    OpenApiValidator.middleware({
      apiSpec: path.join(__dirname, 'generated-schema.json'),
      validateRequests: {
        allowUnknownQueryParameters: false,
        coerceTypes: true, // Equivalent to enableObjectCoercion
      },
      validateResponses: false, // Start with false, can enable later for debugging
      validateSecurity: {
        handlers: {
          groupAuthz: groupAuthzSecurityHandler,
        },
      },
      operationHandlers: path.join(__dirname, 'api'), // Enable operation handlers
      ignorePaths: /\/api-docs/, // Exclude swagger docs
    }),
  )

  // Register authorization middleware after validator
  app.use(authzMiddleware(authz))

  // Register error middleware
  app.use(errorMiddleware)

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  app.use('/api-docs/swagger', swaggerUi.serve, swaggerUi.setup(otomiSpec.spec))
  return app
}

if (!env.isTest) {
  initApp().catch((e) => {
    debug(e)
    process.exit(1)
  })
}
