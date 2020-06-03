import { Operation } from 'express-openapi'
import OtomiStack from '../otomi-stack'
import { OpenApiRequest } from '../api.d'

export default function (otomi: OtomiStack) {
  const GET: Operation = [
    async (req: OpenApiRequest, res) => {
      console.debug(`Trigger deployment: ${JSON.stringify(req.params)}`)
      const teamId = req.session.user.teamId
      const email = req.session.user.email
      try {
        await otomi.triggerDeployment(teamId, email)
        res.status(200).json({})
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
