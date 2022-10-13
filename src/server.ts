/* eslint-disable @typescript-eslint/ban-ts-comment */
import { json } from 'body-parser'
import cors from 'cors'
import express from 'express'
import 'express-async-errors'
import { initialize } from 'express-openapi'
import logger from 'morgan'
import { SecurityHandlers } from 'openapi-security-handler'
import path from 'path'
import swaggerUi from 'swagger-ui-express'
import { default as Authz } from './authz'
import { authzMiddleware, errorMiddleware, isUserAuthenticated, jwtMiddleware } from './middleware'
import { setMockIdx } from './mocks'
import { OpenAPIDoc } from './otomi-models'
import { loadOpenApisSpec } from './otomi-stack'

export default async function initApp(otomiStack: any): Promise<express.Express> {
  const app = express()
  const apiRoutesPath = path.resolve(__dirname, 'api')
  const [spec] = await loadOpenApisSpec()
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
