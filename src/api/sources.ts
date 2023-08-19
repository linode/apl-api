import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:sources')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi }: OpenApiRequestExt, res): void => {
      debug('getAllSources')
      const v = otomi.getAllSources()
      res.json(v)
    },
  ]
  const api = {
    get,
  }
  return api
}
