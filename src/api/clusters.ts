import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../otomi-stack'
import { OpenApiRequest } from '../otomi-models'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    /* business middleware not expressible by OpenAPI documentation goes here */
    (req: OpenApiRequest, res): void => {
      console.info(`Get clusters`)
      const data = otomi.getClusters()
      res.json(data)
    },
  ]
  const api = {
    GET,
  }
  return api
}
