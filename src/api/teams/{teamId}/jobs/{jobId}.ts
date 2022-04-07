import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequest } from '../../../../otomi-models'
import OtomiStack from '../../../../otomi-stack'

const debug = Debug('otomi:api:teams:jobs')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const DELETE: Operation = [
    ({ params: { jobId } }: OpenApiRequest, res): void => {
      debug(`deleteJob(${jobId})`)
      otomi.deleteJob(decodeURIComponent(jobId))
      res.json({})
    },
  ]
  const GET: Operation = [
    ({ params: { jobId } }: OpenApiRequest, res): void => {
      debug(`getJob(${jobId})`)
      const data = otomi.getJob(decodeURIComponent(jobId))
      res.json(data)
    },
  ]
  const PUT: Operation = [
    ({ params: { teamId, jobId }, body }: OpenApiRequest, res): void => {
      debug(`editJob(${jobId})`)
      const data = otomi.editJob(decodeURIComponent(jobId), { ...body, teamId: decodeURIComponent(teamId) })
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
