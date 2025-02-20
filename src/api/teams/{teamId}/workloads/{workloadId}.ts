import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Workload } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:workloads')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { teamId, workloadId } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteWorkload(${workloadId})`)
      await otomi.deleteWorkload(decodeURIComponent(teamId), decodeURIComponent(workloadId))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { teamId, workloadId } }: OpenApiRequestExt, res): void => {
      debug(`getWorkload(${workloadId})`)
      const data = otomi.getWorkload(decodeURIComponent(teamId), decodeURIComponent(workloadId))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, workloadId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editWorkload(${workloadId})`)
      const data = await otomi.editWorkload(decodeURIComponent(teamId), decodeURIComponent(workloadId), {
        ...body,
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
