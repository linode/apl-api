import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../otomi-stack'

const debug = Debug('otomi:api:settings')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    (req, res): void => {
      debug('getAllSettings')
      const v = otomi.getAllSettings()
      res.json(v)
    },
  ]
  const api = {
    GET,
  }
  return api
}
