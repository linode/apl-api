import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../otomi-stack'
import { OpenApiRequestExt } from '../otomi-models'

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
