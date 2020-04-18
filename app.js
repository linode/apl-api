const dotEnv = require('dotenv')
const server = require('./src/server')
const OtomiStack = require('./src/otomi-stack')
const utils = require('./src/utils')

dotEnv.config()
utils.validateConfig()

const otomiStack = new OtomiStack()

otomiStack.init().then((status) => {
  if (!status) {
    console.info('Exiting')
    process.exit(1)
  }
  const app = server.initApp(otomiStack)
  console.info('Listening on port: 8080')
  const srv = app.listen(8080)
  utils.setSignalHandlers(srv)
})
