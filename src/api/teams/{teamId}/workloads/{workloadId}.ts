import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Workload } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:workloads')

export default function (): OperationHandlerArray {
  const del: Operation = [
    ({ otomi, params: { workloadId } }: OpenApiRequestExt, res): void => {
      debug(`deleteWorkload(${workloadId})`)
      otomi.deleteWorkload(decodeURIComponent(workloadId))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { workloadId } }: OpenApiRequestExt, res): void => {
      debug(`getWorkload(${workloadId})`)
      const data = otomi.getWorkload(decodeURIComponent(workloadId))
      res.json(data)
    },
  ]
  const put: Operation = [
    ({ otomi, params: { teamId, workloadId }, body }: OpenApiRequestExt, res): void => {
      debug(`editWorkload(${workloadId})`)
      const data = otomi.editWorkload(decodeURIComponent(workloadId), {
        ...body,
        teamId: decodeURIComponent(teamId),
      } as Workload)
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