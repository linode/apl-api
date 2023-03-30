import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:secrets')

export default function (): OperationHandlerArray {
  const get: Operation = [
    async (req: OpenApiRequestExt, res): Promise<void> => {
      debug('getAllK8sServices')

      const v = await req.otomi.getK8sServices(req.params.teamId)
      res.json(v)
    },
  ]
  const api = {
    get,
  }
  return api
}
