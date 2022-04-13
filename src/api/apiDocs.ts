import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequest } from '../otomi-models'

const debug = Debug('otomi:api')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ apiDoc }: OpenApiRequest, res): void => {
      debug('apiDocs')
      res.json(apiDoc)
    },
  ]
  const api = {
    get,
  }
  return api
}
