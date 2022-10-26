import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:secrets')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi }: OpenApiRequestExt, res): void => {
      debug('getAllSecrets')
      const v = otomi.getAllSecrets()
      res.json(v)
    },
  ]
  const api = {
    get,
  }
  return api
}
