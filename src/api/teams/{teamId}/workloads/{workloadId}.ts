import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Workload } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:workloads')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { workloadId } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteWorkload(${workloadId})`)
      await otomi.deleteWorkload(decodeURIComponent(workloadId))
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
    async ({ otomi, params: { teamId, workloadId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editWorkload(${workloadId})`)
      const data = await otomi.editWorkload(decodeURIComponent(workloadId), {
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
