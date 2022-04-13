import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequest } from '../../../../otomi-models'
import OtomiStack from '../../../../otomi-stack'

const debug = Debug('otomi:api:teams:jobs')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const del: Operation = [
    ({ params: { jobId } }: OpenApiRequest, res): void => {
      debug(`deleteJob(${jobId})`)
      otomi.deleteJob(decodeURIComponent(jobId))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ params: { jobId } }: OpenApiRequest, res): void => {
      debug(`getJob(${jobId})`)
      const data = otomi.getJob(decodeURIComponent(jobId))
      res.json(data)
    },
  ]
  const put: Operation = [
    ({ params: { teamId, jobId }, body }: OpenApiRequest, res): void => {
      debug(`editJob(${jobId})`)
      const data = otomi.editJob(decodeURIComponent(jobId), { ...body, teamId: decodeURIComponent(teamId) })
      res.json(data)
    },
  ]
  const api = {
    delete: del,
    get,
    put,
  }
  return api
}
