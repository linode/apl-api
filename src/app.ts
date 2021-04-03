import { createLightship } from 'lightship'
import initApp from './server'
import OtomiStack from './otomi-stack'

console.log('NODE_ENV: ', process.env.NODE_ENV)

let server
const otomiStack = new OtomiStack()
const lightship = createLightship()

lightship.registerShutdownHandler(() => {
  server.close()
})

otomiStack.init().then(async () => {
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
})
