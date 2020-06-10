import dotEnv from 'dotenv'
import path from 'path'
import initApp from './server'
import OtomiStack from './otomi-stack'
import { setSignalHandlers, validateConfig, loadOpenApisSpec } from './utils'

dotEnv.config()
validateConfig()

const otomiStack = new OtomiStack()

otomiStack.init().then(async (status) => {
  if (!status) {
    console.info('Exiting')
    process.exit(1)
  }
  const openApiPath = path.resolve(__dirname, 'openapi/api.yaml')
  const spec = await loadOpenApisSpec(openApiPath)
  const app = initApp(otomiStack, spec)
  console.info('Listening on port: 8080')
  const srv = app.listen(8080)
  setSignalHandlers(srv)
})
