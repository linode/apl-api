import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Workload } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:workloads')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { teamId, workloadName } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteWorkload(${workloadName})`)
      await otomi.deleteWorkload(decodeURIComponent(teamId), decodeURIComponent(workloadName))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { teamId, workloadName } }: OpenApiRequestExt, res): void => {
      debug(`getWorkload(${workloadName})`)
      const data = otomi.getWorkload(decodeURIComponent(teamId), decodeURIComponent(workloadName))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, workloadName }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editWorkload(${workloadName})`)
      const data = await otomi.editWorkload(decodeURIComponent(teamId), decodeURIComponent(workloadName), {
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
