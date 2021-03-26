import { Operation } from 'express-openapi'
import OtomiStack from '../otomi-stack'
import { OpenApiRequest } from '../otomi-models'

export default function (otomi: OtomiStack) {
  const GET: Operation = [(req: OpenApiRequest, res) => res.status(200).json(otomi.getSettings()[0])]
  const PATCH: Operation = [
    (req: OpenApiRequest, res) => {
      otomi.editSettings(req.body)
      res.status(200).json({})
    },
  ]

  const api = {
    GET,
    PATCH,
  }
  return api
}
