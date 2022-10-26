import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:jobs')

export default function (): OperationHandlerArray {
  const del: Operation = [
    ({ otomi, params: { jobId } }: OpenApiRequestExt, res): void => {
      debug(`deleteJob(${jobId})`)
      otomi.deleteJob(decodeURIComponent(jobId))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { jobId } }: OpenApiRequestExt, res): void => {
      debug(`getJob(${jobId})`)
      const data = otomi.getJob(decodeURIComponent(jobId))
      res.json(data)
    },
  ]
  const put: Operation = [
    ({ otomi, params: { teamId, jobId }, body }: OpenApiRequestExt, res): void => {
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
