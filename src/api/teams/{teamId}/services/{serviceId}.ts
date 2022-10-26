import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:services')

export default function (): OperationHandlerArray {
  const del: Operation = [
    ({ otomi, params: { serviceId } }: OpenApiRequestExt, res): void => {
      debug(`deleteService(${serviceId})`)
      otomi.deleteService(decodeURIComponent(serviceId))
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
    ({ otomi, params: { teamId, serviceId }, body }: OpenApiRequestExt, res): void => {
      debug(`editService(${serviceId})`)
      const data = otomi.editService(decodeURIComponent(serviceId), { ...body, teamId: decodeURIComponent(teamId) })
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
