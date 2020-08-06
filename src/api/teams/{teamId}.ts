import { Operation } from 'express-openapi'
import OtomiStack from '../../otomi-stack'
import { OpenApiRequest } from '../../otomi-models'

export default function (otomi: OtomiStack) {
  const DELETE: Operation = [
    ({ params: { teamId } }: OpenApiRequest, res) => {
      console.debug(`Delete team: ${JSON.stringify({ teamId })}`)
      otomi.deleteTeam(teamId)
      res.status(200).json({})
    },
  ]
  const GET: Operation = [
    ({ params: { teamId } }: OpenApiRequest, res) => {
      console.debug(`Get team: ${JSON.stringify({ teamId })}`)
      const data = otomi.getTeam(teamId)
      res.status(200).json(data)
    },
  ]
  const PUT: Operation = [
    ({ params: { teamId }, body }: OpenApiRequest, res) => {
      console.debug(`Modify team: ${JSON.stringify({ teamId })}`)
      const data = otomi.editTeam(teamId, body)
      res.status(200).json(data)
    },
  ]
  const api = {
    DELETE,
    GET,
    PUT,
  }
  return api
}
