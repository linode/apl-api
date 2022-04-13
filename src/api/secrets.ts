import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../otomi-stack'

const debug = Debug('otomi:api:secrets')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const get: Operation = [
    (req, res): void => {
      debug('getAllSecrets')
      const v = otomi.getAllSecrets()
      res.json(v)
    },
  ]
  const api = {
    get,
  }
  return api
}
