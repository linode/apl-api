import { Operation } from 'express-openapi'
import OtomiStack from '../otomi-stack'

export default function (otomi: OtomiStack) {
  const GET: Operation = [(req, res) => res.status(200).json(otomi.getSettings())]
  const api = {
    GET,
  }
  return api
}
