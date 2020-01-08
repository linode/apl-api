const app = require('express')();
const bodyParser = require('body-parser');
const fs = require('fs');
const openapi = require('express-openapi');
const path = require('path');
const cors = require('cors');

const otomi = require('./otomi-stack')

const openApiPath = path.resolve(__dirname, 'openapi.yaml')
const apiDoc = fs.readFileSync(openApiPath, 'utf8')


app.use(cors());
app.use(bodyParser.json());

function errorMiddleware(err, req, res, next) {
  if (err instanceof otomi.AlreadyExists)
    return res.status(409).json({ error: err.message })
  if (err instanceof otomi.NotExistError)
    return res.status(404).json({ error: err.message })

  return res.status(err.status).json(err)
}

openapi.initialize({
  apiDoc: apiDoc,
  app: app,
  dependencies: {
    otomi: new otomi.OtomiStack(path.resolve(__dirname, 'otomi-stack')),
  },
  paths: path.resolve(__dirname, 'api-routes'),
  errorMiddleware: errorMiddleware,
});

app.use(function (err, req, res, next) {
  res.status(err.status).json(err);
});



module.exports = app;


app.listen(8080);
