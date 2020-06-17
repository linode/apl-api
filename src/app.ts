import dotEnv from 'dotenv'
import initApp from './server'
import OtomiStack from './otomi-stack'
import { setSignalHandlers, validateConfig } from './utils'

dotEnv.config()
validateConfig()

const otomiStack = new OtomiStack()

otomiStack.init().then(async (status) => {
  if (!status) {
    console.info('Exiting')
    process.exit(1)
  }
  const app = await initApp(otomiStack)
  console.info('Listening on port: 8080')
  const srv = app.listen(8080)
  setSignalHandlers(srv)
})
