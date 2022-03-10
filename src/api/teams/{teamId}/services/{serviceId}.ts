import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequest } from '../../../../otomi-models'
import OtomiStack from '../../../../otomi-stack'

const debug = Debug('otomi:api:teams:services')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const DELETE: Operation = [
    ({ params: { serviceId } }: OpenApiRequest, res): void => {
      debug(`deleteService(${serviceId})`)
      otomi.deleteService(decodeURIComponent(serviceId))
      res.json({})
    },
  ]
  const GET: Operation = [
    ({ params: { serviceId } }: OpenApiRequest, res): void => {
      debug(`getService(${serviceId})`)
      const data = otomi.getService(decodeURIComponent(serviceId))
      res.json(data)
    },
  ]
  const PUT: Operation = [
    ({ params: { teamId, serviceId }, body }: OpenApiRequest, res): void => {
      debug(`editService(${serviceId})`)
      const data = otomi.editService(decodeURIComponent(serviceId), { ...body, teamId: decodeURIComponent(teamId) })
      res.json(data)
    },
  ]
  const api = {
    DELETE,
    GET,
    PUT,
  }
  return api
}
