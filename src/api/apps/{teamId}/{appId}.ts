import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequest } from '../../../otomi-models'
import OtomiStack from '../../../otomi-stack'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const get: Operation = [
    ({ params: { teamId, appId } }: OpenApiRequest, res): void => {
      res.json(otomi.getApp(teamId, appId))
    },
  ]
  const put: Operation = [
    ({ body, params: { teamId, appId } }: OpenApiRequest, res): void => {
      res.json(otomi.editApp(teamId, appId, body))
    },
  ]
  const api = {
    get,
    put,
  }
  return api
}
