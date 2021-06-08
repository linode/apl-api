import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../../../otomi-stack'
import { OpenApiRequest } from '../../../otomi-models'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    ({ params: { teamId } }: OpenApiRequest, res): void => {
      console.debug(`Get jobs: ${JSON.stringify({ teamId })}`)
      const v = otomi.getTeamJobs(teamId)
      res.json(v)
    },
  ]
  const POST: Operation = [
    ({ params: { teamId }, body }: OpenApiRequest, res): void => {
      console.debug(`Create a new job: ${JSON.stringify({ teamId, body })}`)
      const v = otomi.createJob(teamId, body)
      res.json(v)
    },
  ]
  const api = {
    GET,
    POST,
  }

  return api
}
