import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../otomi-stack'
import Debug from 'debug'

const debug = Debug('otomi:api:secrets')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    (req, res): void => {
      debug('getAllSecrets')
      const v = otomi.getAllSecrets()
      res.json(v)
    },
  ]
  const api = {
    GET,
  }
  return api
}
