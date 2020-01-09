const dotEnv = require('dotenv')
const express = require('express')
const openapi = require('express-openapi');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const middleware = require('./middleware')
const otomi = require('./otomi-stack')
const dataProvider = require('./data-provider')


function initApp(appDir, dataProvider) {

  const app = express()
  const openApiPath = path.resolve(appDir, 'openapi.yaml')
  const apiRoutesPath = path.resolve(appDir, 'api-routes')
  const apiDoc = fs.readFileSync(openApiPath, 'utf8')

  app.use(cors());
  app.use(bodyParser.json());

  openapi.initialize({
    apiDoc: apiDoc,
    app: app,
    dependencies: {
      otomi: new otomi.OtomiStack(process.env.OTOMI_STACK_PATH, dataProvider),
    },
    paths: apiRoutesPath,
    errorMiddleware: middleware.errorMiddleware,
  });

  app.use(function (err, req, res, next) {
    res.status(err.status).json(err);
  });

  return app
}

dotEnv.config()
const app = initApp(__dirname, new dataProvider.DataProvider())
app.listen(process.env.PORT);
