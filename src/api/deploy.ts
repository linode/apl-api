import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../otomi-stack'
import { OpenApiRequestExt } from '../otomi-models'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    async (req: OpenApiRequestExt, res): Promise<void> => {
      console.debug(`Trigger deployment: ${JSON.stringify(req.params)}`)
      const { email } = req.user
      try {
        await otomi.triggerDeployment(email || '')
        res.json({})
      } catch (err) {
        res.status(err.code).json({ error: err.publicMessage })
        // TODO: remove this part after we know how to merge (if ever):
        // setTimeout(() => {
        //   process.exit()
        // }, 1000)
      }
    },
  ]
  const api = {
    GET,
  }
  return api
}
