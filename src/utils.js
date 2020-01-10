function validateEnv() {
  // Ensure required ENV vars are set
  let requiredEnv = [
    "OTOMI_STACK_PATH",
    "KUBE_CONTEXT",
    "DEPLOYMENT_STAGE"
  ];

  let unsetEnv = requiredEnv.filter((env) => !(typeof process.env[env] !== 'undefined'));

  if (unsetEnv.length > 0) {
    throw new Error("Required ENV variables are not set: [" + unsetEnv.join(', ') + "]");
  }
}

module.exports = {
  validateEnv: validateEnv,
};