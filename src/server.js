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


function getClustersSpec(clouds) {
  let properties = {}
  clouds.forEach(item => {

    properties[item.name] = {
      type: 'array',
      items: {
        type: 'string',
        enum: item.clusters
      },
      uniqueItems: true
    }
  })
  return properties
}

function updateApiSpec(spec, otomiStack) {

  console.log("Updating openapi spec: adding data about available clusters")
  const clouds = otomiStack.getClouds()
  const properties = getClustersSpec(clouds)
  spec.components.schemas.Team.properties.clusters.properties = properties
  spec.components.schemas.Service.properties.clusters.properties = properties
}

function initApp(otomiStack) {

  const app = express()
  const openApiPath = path.resolve(__dirname, 'api.yaml')
  const apiRoutesPath = path.resolve(__dirname, 'api')
  const apiDoc = fs.readFileSync(openApiPath, 'utf8')
  let spec = yaml.safeLoad(apiDoc);

  updateApiSpec(spec, otomiStack)
  const specYaml = yaml.dump(spec)

  app.use(logger('dev'));
  app.use(cors());
  app.use(bodyParser.json());

  function getSecurityHandlers() {
    const securityHandlers = {}
    if (process.env.DISABLE_AUTH !== "1")
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


  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));

  // Serve the static files from the React app
  app.use(express.static(path.join(__dirname, './../client/build')));
  // Handles any requests that don't match the ones above
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + './../client/build/index.html'));
  });

  return app
}

module.exports = {
  initApp: initApp,
  getClustersSpec: getClustersSpec
};
