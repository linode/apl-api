import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequest } from '../../otomi-models'
import OtomiStack from '../../otomi-stack'

const debug = Debug('otomi:api:teams')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const DELETE: Operation = [
    ({ params: { teamId } }: OpenApiRequest, res): void => {
      debug(`deleteTeam(${teamId})`)
      otomi.deleteTeam(teamId)
      res.json({})
    },
  ]
  const GET: Operation = [
    ({ params: { teamId } }: OpenApiRequest, res): void => {
      debug(`getTeam(${teamId})`)
      const data = otomi.getTeam(teamId)
      res.json(data)
    },
  ]
  const PUT: Operation = [
    ({ params: { teamId }, body }: OpenApiRequest, res): void => {
      debug(`editTeam(${teamId})`)
      const data = otomi.editTeam(teamId, body)
      res.json(data)
    },
  ]
  const api = {
    DELETE,
    GET,
    PUT,
  }
  return api
}
