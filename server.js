
var restify = require('restify');


function createServer(options) {
  var server = restify.createServer({});

  // Use the common stuff you probably want
  server.use(restify.plugins.acceptParser(server.acceptable));
  server.use(restify.plugins.bodyParser());

  server.get('/teams/', getTeams);
  server.get('/teams/:teamName', getTeamByName);


  return server;
  };

function getTeams(req, res, next){
  console.info("getTeams")
  res.send(200, "getTeams");
  next();
}

function getTeamByName(req, res, next){
  console.info("getTeamByName")
  res.send(200, req.params.teamName);
  next();
}


module.exports = {
  createServer: createServer
};