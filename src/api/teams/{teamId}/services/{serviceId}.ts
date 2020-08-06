import { Operation } from 'express-openapi'
import OtomiStack from '../../../../otomi-stack'
import { OpenApiRequest } from '../../../../otomi-models'

export default function (otomi: OtomiStack) {
  const DELETE: Operation = [
    ({ params: { serviceId } }: OpenApiRequest, res) => {
      console.debug(`Delete service: ${JSON.stringify({ serviceId })}`)
      otomi.deleteService(decodeURIComponent(serviceId))
      res.status(200).json({})
    },
  ]
  const GET: Operation = [
    ({ params: { serviceId } }: OpenApiRequest, res) => {
      console.debug(`Get service: ${JSON.stringify({ serviceId })}`)
      const data = otomi.getService(decodeURIComponent(serviceId))
      res.status(200).json(data)
    },
  ]
  const PUT: Operation = [
    ({ params: { serviceId }, body }: OpenApiRequest, res) => {
      console.debug(`Modify service: ${JSON.stringify({ serviceId })}`)
      const data = otomi.editService(decodeURIComponent(serviceId), body)
      res.status(200).json(data)
    },
  ]
  const api = {
    DELETE,
    GET,
    PUT,
  }
  return api
}
