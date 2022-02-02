import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../../otomi-stack'
import { OpenApiRequest } from '../../otomi-models'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    ({ params: { teamId } }: OpenApiRequest, res): void => {
      res.json(otomi.getApps(teamId))
    },
  ]
  const api = {
    GET,
  }
  return api
}
