import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from '../otomi-models'
import OtomiStack from '../otomi-stack'

const debug = Debug('otomi:api:session')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    (req: OpenApiRequestExt, res): void => {
      debug('getSession')
      const data = otomi.getSession(req.user)
      res.json(data)
    },
  ]
  const api = {
    GET,
  }
  return api
}
