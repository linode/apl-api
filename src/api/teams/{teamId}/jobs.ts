import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { Job, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:jobs')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeamJobs(${teamId})`)
      const v = otomi.getTeamJobs(teamId)
      res.json(v)
    },
  ]
  const post: Operation = [
    ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): void => {
      debug(`createJob(${teamId}, ...)`)
      const v = otomi.createJob(teamId, body as Job)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }

  return api
}
