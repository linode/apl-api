import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../../../../otomi-stack'
import { OpenApiRequest } from '../../../../otomi-models'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const DELETE: Operation = [
    ({ params: { jobId } }: OpenApiRequest, res): void => {
      console.debug(`Delete job: ${JSON.stringify({ jobId })}`)
      otomi.deleteJob(decodeURIComponent(jobId))
      res.json({})
    },
  ]
  const GET: Operation = [
    ({ params: { jobId } }: OpenApiRequest, res): void => {
      console.debug(`Get job: ${JSON.stringify({ jobId })}`)
      const data = otomi.getJob(decodeURIComponent(jobId))
      res.json(data)
    },
  ]
  const PUT: Operation = [
    ({ params: { teamId, jobId }, body }: OpenApiRequest, res): void => {
      console.debug(`Modify job: ${JSON.stringify({ jobId })}`)
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
