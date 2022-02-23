import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from '../otomi-models'
import OtomiStack from '../otomi-stack'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    (req: OpenApiRequestExt, res): void => {
      const data = otomi.getSession(req.user)
      res.json(data)
    },
  ]
  const api = {
    GET,
  }
  return api
}
