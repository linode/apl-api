
function validateEnv(envVars) {
  // Ensure required ENV vars are set
  let requiredEnv = [
    "GIT_LOCAL_PATH",
    "GIT_REPO_URL",
    "GIT_USER",
    "GIT_PASSWORD",
    "GIT_EMAIL"
  ];

  let unsetEnv = requiredEnv.filter((env) => !(typeof envVars[env] !== 'undefined'));

  if (unsetEnv.length > 0) {
    throw new Error("Required ENV variables are not set: [" + unsetEnv.join(', ') + "]");
  }
}

function validatePaths(env) {

}

function validateConfig() {
  validateEnv(process.env)
  validatePaths(process.env)
}


function setSignalHandlers(server) {
  process.on( 'SIGTERM', function () {
    console.log("Received SIGTERM signal. \nFinishing all requests")
    server.close(function () {
      console.log("Finished all requests.");
    });
  });

  process.on( 'SIGINT', function () {
    console.log("Received SIGINT signal \nFinishing all requests")
    server.close(function () {
      console.log("Finished all requests");
    });
  });
}


module.exports = {
  validateConfig: validateConfig,
  validateEnv: validateEnv,
  setSignalHandlers: setSignalHandlers,
};

