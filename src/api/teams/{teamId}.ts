import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../../otomi-stack'
import { OpenApiRequest } from '../../otomi-models'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const DELETE: Operation = [
    ({ params: { teamId } }: OpenApiRequest, res): void => {
      console.debug(`Delete team: ${JSON.stringify({ teamId })}`)
      otomi.deleteTeam(teamId)
      res.json({})
    },
  ]
  const GET: Operation = [
    ({ params: { teamId } }: OpenApiRequest, res): void => {
      console.debug(`Get team: ${JSON.stringify({ teamId })}`)
      const data = otomi.getTeam(teamId)
      res.json(data)
    },
  ]
  const PUT: Operation = [
    ({ params: { teamId }, body }: OpenApiRequest, res): void => {
      console.debug(`Modify team: ${JSON.stringify({ teamId })}`)
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
