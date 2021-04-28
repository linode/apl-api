import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../otomi-stack'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    (req, res): void => {
      console.debug('Get all secrets')
      const v = otomi.getAllSecrets()
      res.json(v)
    },
  ]
  const api = {
    GET,
  }
  return api
}
