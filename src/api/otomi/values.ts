import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:otomiValues')

export default function (): OperationHandlerArray {
  const get: Operation = [
    /* business middleware not expressible by OpenAPI documentation goes here */
    async ({ otomi, query }: OpenApiRequestExt, res): Promise<void> => {
      debug('getValues')
      debug(query)
      const v = await otomi.repo.requestValues(query)
      res.setHeader('Content-type', 'text/plain')
      res.send(v.data)
    },
  ]
  const api = {
    get,
  }
  return api
}
