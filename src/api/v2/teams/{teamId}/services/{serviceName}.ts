import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { AplServiceRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:services')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { teamId, serviceName } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteService(${serviceName})`)
      await otomi.deleteService(decodeURIComponent(teamId), decodeURIComponent(serviceName))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { teamId, serviceName } }: OpenApiRequestExt, res): void => {
      debug(`getService(${serviceName})`)
      const data = otomi.getAplService(decodeURIComponent(teamId), decodeURIComponent(serviceName))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, serviceName }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editService(${serviceName})`)
      const data = await otomi.editAplService(
        decodeURIComponent(teamId),
        decodeURIComponent(serviceName),
        body as AplServiceRequest,
      )
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
