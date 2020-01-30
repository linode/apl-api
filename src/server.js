const express = require('express')
const openapi = require('express-openapi');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const middleware = require('./middleware')
const logger = require('morgan');


function initApp(otomiStack) {

  const app = express()
  const openApiPath = path.resolve(__dirname, 'api.yaml')
  const apiRoutesPath = path.resolve(__dirname, 'api')
  const apiDoc = fs.readFileSync(openApiPath, 'utf8')
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
    apiDoc: apiDoc,
    app: app,
    dependencies: {
      otomi: otomiStack,
    },
    paths: apiRoutesPath,
    errorMiddleware: middleware.errorMiddleware,
    securityHandlers: getSecurityHandlers(),
  });

  return app
}

module.exports = {
  initApp: initApp,
};
