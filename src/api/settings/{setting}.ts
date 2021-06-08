import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequest } from '../../otomi-models'

export default function (): OperationHandlerArray {
  const GET: Operation = [
    ({ params: { setting } }: OpenApiRequest, res): void => {
      console.debug(`Get settings: ${JSON.stringify({ setting })}`)
      res.json({})
    },
  ]
  const PUT: Operation = [
    ({ params: { setting }, body }: OpenApiRequest, res): void => {
      console.debug(`Modify settings: ${JSON.stringify({ setting })}`)
      res.json({ body })
    },
  ]
  const api = {
    GET,
    PUT,
  }
  return api
}
