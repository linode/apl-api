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
import { Server } from 'http'
import httpSignature from 'http-signature'
import { createLightship } from 'lightship'
import logger from 'morgan'
import path from 'path'
import { default as Authz } from 'src/authz'
import {
  DbMessage,
  authzMiddleware,
  errorMiddleware,
  getIo,
  getSessionStack,
  jwtMiddleware,
  sessionMiddleware,
} from 'src/middleware'
import { setMockIdx } from 'src/mocks'
import { Build, OpenAPIDoc, OpenApiRequestExt, Schema, SealedSecret, Service, Workload } from 'src/otomi-models'
import { default as OtomiStack } from 'src/otomi-stack'
import { extract, getPaths, getValuesSchema } from 'src/utils'
import {
  CHECK_LATEST_COMMIT_INTERVAL,
  DRONE_WEBHOOK_SECRET,
  GIT_PASSWORD,
  GIT_USER,
  UPLOAD_METRICS_INTERVAL,
  cleanEnv,
} from 'src/validators'
import swaggerUi from 'swagger-ui-express'
import Db from './db'
import giteaCheckLatest from './gitea/connect'
import {
  getBuildStatus,
  getKubernetesVersion,
  getNodes,
  getSealedSecretStatus,
  getServiceStatus,
  getWorkloadStatus,
} from './k8s_operations'
import uploadMetrics from './otomiCloud/upload-metrics'

const env = cleanEnv({
  DRONE_WEBHOOK_SECRET,
  CHECK_LATEST_COMMIT_INTERVAL,
  UPLOAD_METRICS_INTERVAL,
  GIT_USER,
  GIT_PASSWORD,
})

const debug = Debug('otomi:app')
debug('NODE_ENV: ', process.env.NODE_ENV)

type OtomiSpec = {
  spec: OpenAPIDoc
  secretPaths: string[]
}

// get the latest commit from Gitea and checks it against the local values
const checkAgainstGitea = async () => {
  const encodedToken = Buffer.from(`${env.GIT_USER}:${env.GIT_PASSWORD}`).toString('base64')
  const otomiStack = await getSessionStack()
  const clusterInfo = otomiStack?.getSettings(['cluster'])
  const latestOtomiVersion = await giteaCheckLatest(encodedToken, clusterInfo)
  // check the local version against the latest online version
  // if the latest online is newer it will be pulled locally
  if (latestOtomiVersion && latestOtomiVersion.data[0].sha !== otomiStack.repo.commitSha) {
    debug('Local values differentiate from Git repository, retrieving latest values')
    await otomiStack.repo.pull()
    // inflate new db
    otomiStack.db = new Db()
    await otomiStack.loadValues()
    const sha = await otomiStack.repo.getCommitSha()
    const msg: DbMessage = { state: 'clean', editor: 'system', sha, reason: 'conflict' }
    getIo().emit('db', msg)
    otomiStack.locked = false
  }
}

// collect and upload metrics to Otomi-Cloud
export const uploadOtomiMetrics = async () => {
  try {
    const otomiStack = await getSessionStack()
    const license = otomiStack.getLicense()
    // if license is valid collect metrics and send them to Otomi-Cloud
    if (license && license.isValid) {
      const apiKey = license.body?.key as string
      const envType = license.body?.envType as string
      // if not local development get the total amount of nodes from the cluster otherwise return 0
      const totalNodes = await getNodes(envType)
      const k8sVersion = await getKubernetesVersion(envType)
      const settings = otomiStack.getSettings()
      const metrics = otomiStack.getMetrics()
      const otomiMetrics = {
        workerNodeCount: totalNodes,
        k8sVersion,
        otomiVersion: settings.otomi!.version,
        teams: metrics.otomi_teams,
        services: metrics.otomi_services,
        workloads: metrics.otomi_workloads,
      }
      // upload to the Otomi-Cloud server
      if (envType) await uploadMetrics(apiKey, envType, otomiMetrics)
    }
  } catch (error) {
    debug('Could not collect metrics for Otomi-Cloud: ', error)
  }
}

const resourceStatus = async () => {
  const otomiStack = await getSessionStack()
  const { cluster } = otomiStack.getSettings(['cluster'])
  const domainSuffix = cluster?.domainSuffix
  const resources = {
    workloads: otomiStack.db.getCollection('workloads') as Array<Workload>,
    builds: otomiStack.db.getCollection('builds') as Array<Build>,
    services: otomiStack.db.getCollection('services') as Array<Service>,
    sealedSecrets: otomiStack.db.getCollection('sealedsecrets') as Array<SealedSecret>,
  }
  const statusFunctions = {
    workloads: getWorkloadStatus,
    builds: getBuildStatus,
    services: getServiceStatus,
    sealedSecrets: getSealedSecretStatus,
  }
  const resourcesStatus = {}
  for (const resourceType in resources) {
    const promises = resources[resourceType].map(async (resource) => {
      try {
        const res = await statusFunctions[resourceType](resource, domainSuffix)
        return { [resource.id]: res }
      } catch (error) {
        console.log(`Could not collect status data for ${resourceType} ${resource.name} resource:`, error)
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
  otomiSpec = { spec, secretPaths }
}
export const getSpec = (): OtomiSpec => {
  return otomiSpec
}
export const getAppSchema = (appId: string): Schema => {
  let id: string = appId
  if (appId.startsWith('ingress-nginx')) id = 'ingress-nginx'
  const appName = `App${pascalCase(id)}`
  return getSpec().spec.components.schemas[appName]
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
  // Transforms the interval to minutes
  const gitCheckVersionInterval = env.CHECK_LATEST_COMMIT_INTERVAL * 60 * 1000
  const gitUploadMetricsInterval = env.UPLOAD_METRICS_INTERVAL * 60 * 1000
  setInterval(async function () {
    await checkAgainstGitea()
  }, gitCheckVersionInterval)
  setInterval(async function () {
    await uploadOtomiMetrics()
  }, gitUploadMetricsInterval)
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

  // emit resource status every 10 seconds
  const emitResourceStatusInterval = 10 * 1000
  setInterval(async function () {
    await resourceStatus()
  }, emitResourceStatusInterval)

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
