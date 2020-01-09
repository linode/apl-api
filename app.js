require('dotenv').config()
const app = require('express')();
const bodyParser = require('body-parser');
const fs = require('fs');
const openapi = require('express-openapi');
const path = require('path');
const cors = require('cors');
const middleware = require('./middleware')
const otomi = require('./otomi-stack')
const dataProvider = require('./data-provider')

const openApiPath = path.resolve(__dirname, 'openapi.yaml')
const apiDoc = fs.readFileSync(openApiPath, 'utf8')


function configureApp(dataProvider) {
  app.use(cors());
  app.use(bodyParser.json());

  openapi.initialize({
    apiDoc: apiDoc,
    app: app,
    dependencies: {
      otomi: new otomi.OtomiStack(process.env.OTOMI_STACK_PATH, dataProvider),
    },
    paths: path.resolve(__dirname, 'api-routes'),
    errorMiddleware: middleware.errorMiddleware,
  });

  app.use(function (err, req, res, next) {
    res.status(err.status).json(err);
  });
}


configureApp(new dataProvider.DataProvider())
app.listen(process.env.PORT);
