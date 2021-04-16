import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../../../../otomi-stack'
import { OpenApiRequest } from '../../../../otomi-models'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const DELETE: Operation = [
    ({ params: { serviceId } }: OpenApiRequest, res): void => {
      console.debug(`Delete service: ${JSON.stringify({ serviceId })}`)
      otomi.deleteService(decodeURIComponent(serviceId))
      res.json({})
    },
  ]
  const GET: Operation = [
    ({ params: { serviceId } }: OpenApiRequest, res): void => {
      console.debug(`Get service: ${JSON.stringify({ serviceId })}`)
      const data = otomi.getService(decodeURIComponent(serviceId))
      res.json(data)
    },
  ]
  const PUT: Operation = [
    ({ params: { serviceId }, body }: OpenApiRequest, res): void => {
      console.debug(`Modify service: ${JSON.stringify({ serviceId })}`)
      const data = otomi.editService(decodeURIComponent(serviceId), body)
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
