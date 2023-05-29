import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:metrics')

export default function (): OperationHandlerArray {
  const get: Operation = [
    async ({ otomi }: OpenApiRequestExt, res) => {
      debug('get')
      const data = await otomi.getMetrics()
      res.json(data)
    },
  ]
  const api = {
    get,
  }
  return api
}
