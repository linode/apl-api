const app = require('express')();
const bodyParser = require('body-parser');
const fs = require('fs');
const openapi = require('express-openapi');
const path = require('path');
const cors = require('cors');


app.use(cors());
app.use(bodyParser.json());

openapi.initialize({
  apiDoc: fs.readFileSync(path.resolve(__dirname, 'api-doc.yml'), 'utf8'),
  app: app,
  paths: path.resolve(__dirname, 'api-routes'),
  operations: {
    getTeams: function get(req, res){
      res.status(200).json({
        id: "team1"
      })
    }
  }
});

app.use(function(err, req, res, next) {
  res.status(err.status).json(err);
});

module.exports = app;


app.listen(8080);
