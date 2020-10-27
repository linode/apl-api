import { Operation } from 'express-openapi'
import OtomiStack from '../otomi-stack'
import { OpenApiRequestExt } from '../otomi-models'

export default function (otomi: OtomiStack) {
  const GET: Operation = [
    async (req: OpenApiRequestExt, res) => {
      console.debug(`Trigger deployment: ${JSON.stringify(req.params)}`)
      const email = req.user.email
      try {
        await otomi.triggerDeployment(email)
        res.status(200).json({})
        setTimeout(() => {
          process.exit()
        }, 1000)
      } catch (err) {
        console.error(err)
        res.status(409).json({ error: err.message })
      }
    },
  ]
  const api = {
    GET,
  }
  return api
}
