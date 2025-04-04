import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:policies')

export default function (): OperationHandlerArray {
  const get: Operation = [
    /* business middleware not expressible by OpenAPI documentation goes here */
    ({ otomi }: OpenApiRequestExt, res): void => {
      debug('getAllPolicies')
      const v = otomi.getAllPolicies()
      res.json(v)
    },
  ]
  const api = {
    get,
  }
  return api
}
