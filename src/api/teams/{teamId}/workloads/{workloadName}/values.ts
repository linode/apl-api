import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, WorkloadValues } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:workloadValues')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId, workloadName } }: OpenApiRequestExt, res): void => {
      debug(`getWorkloadValues(${workloadName})`)
      const data = otomi.getWorkloadValues(decodeURIComponent(teamId), decodeURIComponent(workloadName))
      res.json(data)
    },
  ]

  const put: Operation = [
    async ({ otomi, params: { teamId, workloadName }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`putWorkloadValues(${workloadName})`)
      const data = await otomi.editWorkloadValues(decodeURIComponent(teamId), decodeURIComponent(workloadName), {
        ...body,
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
