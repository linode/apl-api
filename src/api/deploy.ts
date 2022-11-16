import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:deploy')

export default function (): OperationHandlerArray {
  const get: Operation = [
    async ({ otomi }: OpenApiRequestExt, res): Promise<void> => {
      debug(`doDeployment`)
      await otomi.doDeployment()
      res.json({})
    },
  ]
  const api = {
    get,
  }
  return api
}
