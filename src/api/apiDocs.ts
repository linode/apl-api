import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequest } from '../otomi-models'

const debug = Debug('otomi:api')

export default function (): OperationHandlerArray {
  const GET: Operation = [
    ({ apiDoc }: OpenApiRequest, res): void => {
      debug('apiDocs')
      res.json(apiDoc)
    },
  ]
  const api = {
    GET,
  }
  return api
}
