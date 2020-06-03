import { Operation } from 'express-openapi'
import OtomiStack from '../../../otomi-stack'
import { OpenApiRequest } from '../../../api.d'

export default function (otomi: OtomiStack) {
  const GET: Operation = [
    ({ params: { teamId } }: OpenApiRequest, res, next) => {
      console.debug(`Get services: ${JSON.stringify({ teamId })}`)
      const v = otomi.getTeamServices(teamId)
      res.status(200).json(v)
    },
  ]
  const POST: Operation = [
    ({ params: { teamId }, body }: OpenApiRequest, res, next) => {
      console.debug(`Create a new service: ${JSON.stringify({ teamId, body })}`)
      const v = otomi.createService(teamId, body)
      res.status(200).json(v)
    },
  ]
  const api = {
    GET,
    POST,
  }
  return api
}
