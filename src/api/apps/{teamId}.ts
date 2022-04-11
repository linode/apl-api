import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequest } from '../../otomi-models'
import OtomiStack from '../../otomi-stack'

const debug = Debug('otomi:api:apps')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const get: Operation = [
    ({ params: { teamId } }: OpenApiRequest, res): void => {
      res.json(otomi.getApps(teamId))
    },
  ]
  const put: Operation = [
    ({ body, params: { teamId } }, res): void => {
      debug('toggleApps')
      otomi.toggleApps(teamId, body)
      res.end()
    },
  ]
  const api = {
    get,
    put,
  }
  return api
}
