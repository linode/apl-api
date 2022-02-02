import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../otomi-stack'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    /* business middleware not expressible by OpenAPI documentation goes here */
    (req, res): void => {
      console.debug('Get all apps')
      const v = otomi.getApps()
      res.json(v)
    },
  ]
  const api = {
    GET,
  }
  return api
}
