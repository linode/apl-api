import { createLightship } from 'lightship'
import initApp from './server'
import OtomiStack from './otomi-stack'

console.log('NODE_ENV: ', process.env.NODE_ENV)

const otomiStack = new OtomiStack()
otomiStack.init()

async function initServer() {
  let server
  const lightship = createLightship()
  lightship.registerShutdownHandler(() => {
    server.close()
  })
  const app = await initApp(otomiStack)
  const { PORT = 8080 } = process.env
  server = app
    .listen(PORT, () => {
      console.info(`Listening on port: http://127.0.0.1:${PORT}`)
      lightship.signalReady()
    })
    .on('error', () => {
      lightship.shutdown()
    })
}

initServer().catch((e) => {
  console.error(e)
  process.exit(1)
})
