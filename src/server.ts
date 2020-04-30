import express from 'express'
import { initialize } from 'express-openapi'
import bodyParser from 'body-parser'
import fs from 'fs'
import path from 'path'
import cors from 'cors'
import logger from 'morgan'
import swaggerUi from 'swagger-ui-express'
import yaml from 'js-yaml'
import { errorMiddleware, isAuthorized } from './middleware'

export default function initApp(otomiStack) {
  const app = express()
  const openApiPath = path.resolve(__dirname, 'api.yaml')
  const apiRoutesPath = path.resolve(__dirname, 'api')
  const apiDoc = fs.readFileSync(openApiPath, 'utf8')
  const spec = yaml.safeLoad(apiDoc)

  const specYaml = yaml.dump(spec)

  app.use(logger('dev'))
  app.use(cors())
  app.use(bodyParser.json())

  function getSecurityHandlers() {
    const securityHandlers = { groupAuthz: undefined }
    if (process.env.DISABLE_AUTH !== '1') securityHandlers.groupAuthz = isAuthorized
    return securityHandlers
  }

  initialize({
    apiDoc: specYaml,
    app,
    dependencies: {
      otomi: otomiStack,
    },
    paths: apiRoutesPath,
    errorMiddleware,
    securityHandlers: getSecurityHandlers(),
  })

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec))

  // Serve the static files from the React app
  app.use('/static/', express.static(path.join(__dirname, './../client/build/static')))
  // Handles any requests that don't match the ones above
  app.get('/*', (req, res) => {
    res.sendFile(path.join(`${__dirname}./../client/build/index.html`))
  })

  return app
}
