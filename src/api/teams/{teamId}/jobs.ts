import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequest } from '../../../otomi-models'
import OtomiStack from '../../../otomi-stack'

const debug = Debug('otomi:api:teams:jobs')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const get: Operation = [
    ({ params: { teamId } }: OpenApiRequest, res): void => {
      debug(`getTeamJobs(${teamId})`)
      const v = otomi.getTeamJobs(teamId)
      res.json(v)
    },
  ]
  const post: Operation = [
    ({ params: { teamId }, body }: OpenApiRequest, res): void => {
      debug(`createJob(${teamId}, ...)`)
      const v = otomi.createJob(teamId, body)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }

  return api
}
