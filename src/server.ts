import express from 'express'
import { initialize } from 'express-openapi'
import bodyParser from 'body-parser'
import path from 'path'
import $RefParser from '@apidevtools/json-schema-ref-parser'
import cors from 'cors'
import logger from 'morgan'
import swaggerUi from 'swagger-ui-express'
import get from 'lodash/get'
import { errorMiddleware, getSessionUser, isUserAuthorized, getCrudOperation } from './middleware'
import Authz from './authz'
import { OpenApiRequestExt } from './otomi-models'
import jwt from 'express-jwt'
import jwksRsa from 'jwks-rsa'

const env = process.env

export async function loadOpenApisSpec() {
  const openApiPath = path.resolve(__dirname, 'openapi/api.yaml')
  console.log(`Loading api spec from: ${openApiPath}`)
  const schema = await $RefParser.bundle(openApiPath)
  return schema
}

export default async function initApp(otomiStack) {
  const app = express()
  const apiRoutesPath = path.resolve(__dirname, 'api')
  const spec: any = await loadOpenApisSpec()
  const authz = new Authz(spec)

  app.use(logger('dev'))
  app.use(cors())
  app.use(bodyParser.json())
  if (env.NODE_ENV === 'development') {
    app.use((req: OpenApiRequestExt, res, next) => {
      const group = req.header('Auth-Group') ? `team-${req.header('Auth-Group')}` : undefined
      // default to admin unless team is given
      const isAdmin = !group || group === 'team-admin'
      const groups = [`team-${env.CLUSTER_ID.split('/')[1]}`, 'team-otomi']
      if (group && !groups.includes(group)) groups.push(group)
      req.user = getSessionUser({
        email: isAdmin ? 'bob.admin@otomi.cloud' : `joe.team@otomi.cloud`,
        groups,
        roles: [],
      })
      next()
    })
  } else {
    app.use(
      jwt({
        secret: jwksRsa.expressJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: `${env.OIDC_ENDPOINT}/.well-known/jwks.json`,
        }),
        issuer: env.OIDC_ENDPOINT,
        audience: env.OIDC_NAME,
        algorithms: ['RS256'],
      }).unless({
        path: ['/v1/readiness', '/v1/apiDocs'],
      }),
    )
    app.use((req: any, res, next) => {
      if (req.user) req.user = getSessionUser(req.user)
      next()
    })
  }

  function getSecurityHandlers() {
    const securityHandlers = { groupAuthz: undefined }

    if (process.env.DISABLE_AUTH !== '1')
      securityHandlers.groupAuthz = (req) => {
        return isUserAuthorized(req, authz)
      }
    return securityHandlers
  }

  function stripNotAllowedAttributes(req: OpenApiRequestExt, res, next) {
    if (req.operationDoc.security === undefined || req.operationDoc.security.length === 0) {
      next()
      return
    }

    const schema: string = get(req, 'operationDoc.x-aclSchema', '')
    const schemaName = schema.split('/').pop()
    const action = getCrudOperation(req)
    req.body = authz.getDataWithAllowedAttributes(action, schemaName, req.user, req.body)
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
