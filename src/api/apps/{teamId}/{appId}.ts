import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../../../otomi-stack'
import { OpenApiRequest } from '../../../otomi-models'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    ({ params: { teamId, appId } }: OpenApiRequest, res): void => {
      res.json(otomi.getApp(teamId, appId))
    },
  ]
  const PUT: Operation = [
    ({ body, params: { teamId, appId } }: OpenApiRequest, res): void => {
      res.json(otomi.editApp(teamId, appId, body))
    },
  ]
  const api = {
    GET,
    PUT,
  }
  return api
}
