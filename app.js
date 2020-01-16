const dotEnv = require('dotenv')
const server = require('./src/server');
const otomi = require('./src/otomi-stack')
const utils = require('./src/utils')

dotEnv.config()
utils.validateConfig();

const otomiStack = new otomi.OtomiStack(
  process.env.OTOMI_STACK_PATH,
  process.env.KUBE_CONTEXT,
  process.env.DEPLOYMENT_STAGE,
  process.env.DB_PATH,
  )
const app = server.initApp(otomiStack)
console.info("Listening on port: 8080")
app.listen(8080);
