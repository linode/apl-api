import { Operation } from 'express-openapi'
import OtomiStack from '../otomi-stack'

export default function (otomi: OtomiStack) {
  const GET: Operation = [(req: OpenApiRequestExt, res) => res.status(200).json(otomi.getSettings())]
  const PATCH: Operation = [
    (req: OpenApiRequestExt, res) => {
      res.status(200).json(otomi.saveSettings())
    },
  ]
  const api = {
    GET,
    PATCH,
  }
  return api
}
