const express = require('express')
const openapi = require('express-openapi');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const middleware = require('./middleware')

function initApp(otomiStack) {

  const app = express()
  const openApiPath = path.resolve(__dirname, 'api.yaml')
  const apiRoutesPath = path.resolve(__dirname, 'api')
  const apiDoc = fs.readFileSync(openApiPath, 'utf8')

  app.use(cors());
  app.use(bodyParser.json());

  openapi.initialize({
    apiDoc: apiDoc,
    app: app,
    dependencies: {
      otomi: otomiStack,
    },
    paths: apiRoutesPath,
    errorMiddleware: middleware.errorMiddleware,
  });

  app.use(function (err, req, res, next) {
    res.status(err.status).json(err);
  });

  return app
}

module.exports = {
  initApp: initApp,
};
