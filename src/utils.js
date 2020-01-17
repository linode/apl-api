
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

module.exports = {
  validateConfig: validateConfig,
  validateEnv: validateEnv,
};