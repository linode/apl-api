import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from '../otomi-models'
import OtomiStack from '../otomi-stack'

const debug = Debug('otomi:api:deploy')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const get: Operation = [
    async (req: OpenApiRequestExt, res): Promise<void> => {
      debug(`triggerDeployment`)
      const { email } = req.user
      try {
        await otomi.triggerDeployment(email || '')
        res.json({})
      } catch (err) {
        debug(`Error: ${JSON.stringify(err)}`)
        res.status(err.code || 500).json({ error: err.publicMessage ?? 'Internal Server Error' })
        // TODO: remove this part after we know how to merge (if ever):
        // setTimeout(() => {
        //   process.exit()
        // }, 1000)
      }
    },
  ]
  const api = {
    get,
  }
  return api
}
