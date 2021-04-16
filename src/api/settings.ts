import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../otomi-stack'
import { OpenApiRequest } from '../otomi-models'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [(req: OpenApiRequest, res): object => res.json(otomi.getSettings())]
  const PUT: Operation = [
    (req: OpenApiRequest, res): void => {
      otomi.editSettings(req.body)
      res.json({})
    },
  ]

  const api = {
    GET,
    PUT,
  }
  return api
}
