import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:otomiValues')

export default function (): OperationHandlerArray {
  const get: Operation = [
    /* business middleware not expressible by OpenAPI documentation goes here */
    async ({ otomi, query }: OpenApiRequestExt, res): Promise<void> => {
      debug('getValues', query)
      const data = await otomi.getValues(query)
      res.setHeader('Content-type', 'text/plain')
      res.send(data)
    },
  ]
  const api = {
    get,
  }
  return api
}
