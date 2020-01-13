
const fs = require('fs')

function validateEnv(envVars) {
  // Ensure required ENV vars are set
  let requiredEnv = [
    "OTOMI_STACK_PATH",
    "KUBE_CONTEXT",
    "DEPLOYMENT_STAGE"
  ];

  let unsetEnv = requiredEnv.filter((env) => !(typeof envVars[env] !== 'undefined'));

  if (unsetEnv.length > 0) {
    throw new Error("Required ENV variables are not set: [" + unsetEnv.join(', ') + "]");
  }
}

function validatePaths(env) {
  if (!fs.existsSync(env.OTOMI_STACK_PATH))
    throw new Error("Path does not exist: " + env.OTOMI_STACK_PATH);
}

function validateConfig() {
  validateEnv(process.env)
  validatePaths(process.env)
}

module.exports = {
  validateConfig: validateConfig,
};