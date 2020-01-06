
var server = require('./server');

(function main() {

  console.info("Starting server...");

  var srv = server.createServer({});

  srv.listen(8080, function onListening() {
      console.info('listening at %s', srv.url);
  });

})();