import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../otomi-stack'

const debug = Debug('otomi:api:jobs')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    /* business middleware not expressible by OpenAPI documentation goes here */
    (req, res): void => {
      debug('getAllJobs')
      const v = otomi.getAllJobs()
      res.json(v)
    },
  ]
  const api = {
    GET,
  }
  return api
}
