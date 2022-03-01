import { createLightship } from 'lightship'
import OtomiStack from './otomi-stack'
import initApp from './server'

console.log('NODE_ENV: ', process.env.NODE_ENV)

const otomiStack = new OtomiStack()
otomiStack.init()

async function initServer() {
  const lightship = createLightship()
  const app = await initApp(otomiStack)
  const { PORT = 8080 } = process.env
  const server = app
    .listen(PORT, () => {
      console.info(`Listening on port: http://127.0.0.1:${PORT}`)
      lightship.signalReady()
    })
    .on('error', () => {
      lightship.shutdown()
    })
  lightship.registerShutdownHandler(() => {
    server.close()
  })
}

initServer().catch((e) => {
  console.error(e)
  process.exit(1)
})
