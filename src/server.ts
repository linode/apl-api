/* eslint-disable @typescript-eslint/ban-ts-comment */
import express from 'express'
import { SecurityHandlers } from 'openapi-security-handler'
import { initialize } from 'express-openapi'
import { json } from 'body-parser'
import path from 'path'
import cors from 'cors'
import logger from 'morgan'
import swaggerUi from 'swagger-ui-express'
import { errorMiddleware, jwtMiddleware, isUserAuthenticated, authzMiddleware } from './middleware'
import Authz from './authz'
import { OpenAPIDoc, OtomiSpec } from './otomi-models'
import OtomiStack, { loadOpenApisSpec } from './otomi-stack'

export default async function initApp(otomiStack: OtomiStack): Promise<express.Express> {
  const app = express()
  const apiRoutesPath = path.resolve(__dirname, 'api')
  const spec: OpenAPIDoc = await loadOpenApisSpec()
  otomiStack.setSpec(spec as unknown as OtomiSpec)
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
