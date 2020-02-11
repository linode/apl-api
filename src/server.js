const express = require('express')
const openapi = require('express-openapi');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const middleware = require('./middleware')
const logger = require('morgan');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');


function updateHostInApiSpec(spec) {
  if (process.env.API_PUBLIC_URL) {
    console.log(spec)
    spec.servers[0] = { url: process.env.API_PUBLIC_URL }
  }

}

function initApp(otomiStack) {

  const app = express()
  const openApiPath = path.resolve(__dirname, 'api.yaml')
  const apiRoutesPath = path.resolve(__dirname, 'api')
  const apiDoc = fs.readFileSync(openApiPath, 'utf8')
  let spec = yaml.safeLoad(apiDoc);
  updateHostInApiSpec(spec)

  const specYaml = yaml.dump(spec)

  app.use(logger('dev'));
  app.use(cors());
  app.use(bodyParser.json());

  function getSecurityHandlers(){
    const securityHandlers = {}
    if (process.env.DISABLE_AUTH !== 1)
      securityHandlers.groupAuthz = middleware.isAuthorized
    return securityHandlers
  }

  openapi.initialize({
    apiDoc: specYaml,
    app: app,
    dependencies: {
      otomi: otomiStack,
    },
    paths: apiRoutesPath,
    errorMiddleware: middleware.errorMiddleware,
    securityHandlers: getSecurityHandlers(),
  });

  const doc = yaml.safeLoad(apiDoc);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(doc));

  // Serve the static files from the React app
  app.use(express.static(path.join(__dirname, '../client/build')));

  // Handles any requests that don't match the ones above
  app.get('*', (req,res) =>{
    res.sendFile(path.join(__dirname+'../client/build/index.html'));
  });

  return app
}

module.exports = {
  initApp: initApp,
};
