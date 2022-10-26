import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:deploy')

export default function (): OperationHandlerArray {
  const get: Operation = [
    async ({ otomi }: OpenApiRequestExt, res): Promise<void> => {
      debug(`triggerDeployment`)
      try {
        await otomi.triggerDeployment()
        res.json({})
      } catch (err) {
        debug(`Error: ${JSON.stringify(err)}`)
        res.status(err.code || 500).json({ error: err.publicMessage ?? 'Internal Server Error' })
      }
    },
  ]
  const api = {
    get,
  }
  return api
}
