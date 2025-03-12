import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Service } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:services')

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
      const data = otomi.getService(decodeURIComponent(teamId), decodeURIComponent(serviceName))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, serviceName }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editService(${serviceName})`)
      const data = await otomi.editService(decodeURIComponent(teamId), decodeURIComponent(serviceName), {
        ...body,
      } as Service)
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
