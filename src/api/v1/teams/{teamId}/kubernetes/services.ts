import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:kubernetes:services')

export default function (): OperationHandlerArray {
  const get: Operation = [
    async (req: OpenApiRequestExt, res): Promise<void> => {
      debug('getAllK8sServices')
      try {
        const v = await req.otomi.getK8sServices(req.params.teamId)
        res.json(v)
      } catch (e) {
        debug(e)
        res.json([])
      }
    },
  ]
  const api = {
    get,
  }
  return api
}
