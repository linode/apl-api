import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../../../otomi-stack'
import { OpenApiRequest } from '../../../otomi-models'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    ({ params: { teamId } }: OpenApiRequest, res): void => {
      console.debug('Get team self service flags')
      const v = otomi.getTeamSelfServiceFlags(teamId)
      res.json(v)
    },
  ]
  const PUT: Operation = [
    ({ params: { teamId }, body }: OpenApiRequest, res): void => {
      console.debug('Update team self service flags')
      const v = otomi.editTeamSelfServiceFlags(teamId, body)
      res.json(v)
    },
  ]
  const api = {
    GET,
    PUT,
  }
  return api
}
