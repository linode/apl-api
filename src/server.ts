import express from 'express'
import { initialize } from 'express-openapi'
import bodyParser from 'body-parser'
import fs from 'fs'
import path from 'path'
import cors from 'cors'
import logger from 'morgan'
import swaggerUi from 'swagger-ui-express'
import yaml from 'js-yaml'
import get from 'lodash/get'
import { errorMiddleware, isAuthorizedFactory, getSession } from './middleware'
import Authz from './authz'

export default function initApp(otomiStack) {
  const app = express()
  const openApiPath = path.resolve(__dirname, 'api.yaml')
  const apiRoutesPath = path.resolve(__dirname, 'api')
  const apiDoc = fs.readFileSync(openApiPath, 'utf8')
  const spec = yaml.safeLoad(apiDoc)
  const authz = new Authz(spec)

  app.use(logger('dev'))
  app.use(cors())
  app.use(bodyParser.json())

  function getSecurityHandlers() {
    const securityHandlers = { groupAuthz: undefined }

    if (process.env.DISABLE_AUTH !== '1') securityHandlers.groupAuthz = isAuthorizedFactory(authz)
    return securityHandlers
  }

  function stripNotAllowedAttributes(req, res, next) {
    const schema: string = get(req, 'operationDoc.x-aclSchema', '')
    const schemaName = schema.split('/').pop()
    const action = req.method.toLowerCase()
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
