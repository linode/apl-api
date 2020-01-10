const dotEnv = require('dotenv')
const server = require('./src/server');
const otomi = require('./src/otomi-stack')
const utils = require('./src/utils')

dotEnv.config()
utils.validateEnv();

const otomiStack = new otomi.OtomiStack(
  process.env.OTOMI_STACK_PATH,
  process.env.KUBE_CONTEXT,
  process.env.DEPLOYMENT_STAGE
  )
const app = server.initApp(otomiStack)
console.info("Listening on port: " + process.env.PORT)
app.listen(process.env.PORT);
