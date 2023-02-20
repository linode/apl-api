import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, WorkloadValues } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:workloadValues')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { workloadId } }: OpenApiRequestExt, res): void => {
      debug(`editWorkloadValues(${workloadId})`)
      const data = otomi.getWorkloadValues(decodeURIComponent(workloadId))
      res.json(data)
    },
  ]

  const put: Operation = [
    ({ otomi, params: { teamId, workloadId }, body }: OpenApiRequestExt, res): void => {
      debug(`editWorkloadValues(${workloadId})`)
      const data = otomi.editWorkloadValues(decodeURIComponent(workloadId), {
        ...body,
        teamId: decodeURIComponent(teamId),
      } as WorkloadValues)
      res.json(data)
    },
  ]
  const api = {
    get,
    put,
  }
  return api
}
