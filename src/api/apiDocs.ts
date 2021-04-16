import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequest } from '../otomi-models'

export default function (): OperationHandlerArray {
  const GET: Operation = [
    ({ apiDoc }: OpenApiRequest, res): void => {
      res.json(apiDoc)
    },
  ]
  const api = {
    GET,
  }
  return api
}
