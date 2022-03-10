import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequest } from '../../../otomi-models'
import OtomiStack from '../../../otomi-stack'

const debug = Debug('otomi:api:teams:services')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    ({ params: { teamId } }: OpenApiRequest, res): void => {
      debug(`getTeamServices(${teamId})`)
      const v = otomi.getTeamServices(teamId)
      res.json(v)
    },
  ]
  const POST: Operation = [
    ({ params: { teamId }, body }: OpenApiRequest, res): void => {
      debug(`createService(${teamId}, ...)`)
      const v = otomi.createService(teamId, body)
      res.json(v)
    },
  ]
  const api = {
    GET,
    POST,
  }

  return api
}
