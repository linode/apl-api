import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../otomi-stack'
import Debug from 'debug'

const debug = Debug('otomi:api:services')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const get: Operation = [
    /* business middleware not expressible by OpenAPI documentation goes here */
    (req, res): void => {
      debug('getAllServices')
      const v = otomi.getAllServices()
      res.json(v)
    },
  ]
  const api = {
    get,
  }
  return api
}
