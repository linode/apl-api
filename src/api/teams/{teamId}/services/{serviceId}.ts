import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Service } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:services')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { serviceId } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteService(${serviceId})`)
      await otomi.deleteService(decodeURIComponent(serviceId))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { serviceId } }: OpenApiRequestExt, res): void => {
      debug(`getService(${serviceId})`)
      const data = otomi.getService(decodeURIComponent(serviceId))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, serviceId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editService(${serviceId})`)
      const data = await otomi.editService(decodeURIComponent(serviceId), {
        ...body,
        teamId: decodeURIComponent(teamId),
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
