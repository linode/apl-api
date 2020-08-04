import express from 'express'
import { initialize } from 'express-openapi'
import bodyParser from 'body-parser'
import path from 'path'
import $RefParser from '@apidevtools/json-schema-ref-parser'
import cors from 'cors'
import logger from 'morgan'
import swaggerUi from 'swagger-ui-express'
import get from 'lodash/get'
import { errorMiddleware, isAuthorizedFactory, getCrudOperation, getSession } from './middleware'
import Authz from './authz'
import { OpenApiRequest } from './api.d'
import { getEnv } from './utils'

export async function loadOpenApisSpec() {
  const openApiPath = path.resolve(__dirname, 'openapi/api.yaml')
  console.log(`Loading api spec from: ${openApiPath}`)
  const schema = await $RefParser.bundle(openApiPath)
  return schema
}

export default async function initApp(otomiStack) {
  const env = getEnv()

  const app = express()
  const apiRoutesPath = path.resolve(__dirname, 'api')
  const spec: any = await loadOpenApisSpec()
  const authz = new Authz(spec)

  app.use(logger('dev'))
  app.use(cors())
  app.use(bodyParser.json())

  function getSecurityHandlers() {
    const securityHandlers = { groupAuthz: undefined }

    if (env.DISABLE_AUTH) return securityHandlers
    securityHandlers.groupAuthz = isAuthorizedFactory(authz)
    return securityHandlers
  }

  function stripNotAllowedAttributes(req: OpenApiRequest, res, next) {
    if (req.operationDoc.security === undefined || req.operationDoc.security.length === 0) {
      next()
      return
    }

    const schema: string = get(req, 'operationDoc.x-aclSchema', '')
    const schemaName = schema.split('/').pop()
    const action = getCrudOperation(req)
    const session = getSession(req)
    req.body = authz.getDataWithAllowedAttributes(action, schemaName, session, req.body)
    next()
  }

  initialize({
    apiDoc: {
      ...spec,
      'x-express-openapi-additional-middleware': [stripNotAllowedAttributes],
    },
    app,
    dependencies: {
      otomi: otomiStack,
      authz,
    },
    paths: apiRoutesPath,
    errorMiddleware,
    securityHandlers: getSecurityHandlers(),
    routesGlob: '**/*.{ts,js}',
    routesIndexFileRegExp: /(?:index)?\.[tj]s$/,
  })

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec))

  return app
}
