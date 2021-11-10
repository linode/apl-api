/* eslint-disable @typescript-eslint/ban-ts-comment */
import express from 'express'
import { SecurityHandlers } from 'openapi-security-handler'
import { initialize } from 'express-openapi'
import { json } from 'body-parser'
import path from 'path'
import { parse } from '@apidevtools/json-schema-ref-parser'
import cors from 'cors'
import logger from 'morgan'
import swaggerUi from 'swagger-ui-express'
import { errorMiddleware, jwtMiddleware, isUserAuthenticated, authzMiddleware } from './middleware'
import Authz from './authz'
import { OpenAPIDoc } from './otomi-models'
import OtomiStack from './otomi-stack'

export async function loadOpenApisSpec(): Promise<OpenAPIDoc> {
  const openApiPath = path.resolve(__dirname, 'generated-schema.json')
  console.info(`Loading api spec from: ${openApiPath}`)
  const schema = await parse(openApiPath)
  return schema as OpenAPIDoc
}

export default async function initApp(otomiStack: OtomiStack): Promise<express.Express> {
  const app = express()
  const apiRoutesPath = path.resolve(__dirname, 'api')
  const spec: OpenAPIDoc = await loadOpenApisSpec()
  const authz = new Authz(spec)

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
