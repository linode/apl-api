import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { AplWorkloadRequest, DeepPartial, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:workloads')

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
      const data = otomi.getAplWorkload(decodeURIComponent(teamId), decodeURIComponent(workloadName))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, workloadName }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editWorkload(${workloadName})`)
      const data = await otomi.editAplWorkload(
        decodeURIComponent(teamId),
        decodeURIComponent(workloadName),
        body as AplWorkloadRequest,
      )
      res.json(data)
    },
  ]
  const patch: Operation = [
    async ({ otomi, params: { teamId, workloadName }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editWorkload(${workloadName}, patch)`)
      const data = await otomi.editAplWorkload(
        decodeURIComponent(teamId),
        decodeURIComponent(workloadName),
        body as DeepPartial<AplWorkloadRequest>,
        true,
      )
      res.json(data)
    },
  ]
  const api = {
    delete: del,
    get,
    put,
    patch,
  }
  return api
}
