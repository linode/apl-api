import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:backups')

export default function (): OperationHandlerArray {
  const get: Operation = [
    /* business middleware not expressible by OpenAPI documentation goes here */
    ({ otomi }: OpenApiRequestExt, res): void => {
      debug('getAllBackups')
      const v = otomi.getAllBackups()
      res.json(v)
    },
  ]
  const api = {
    get,
  }
  return api
}
