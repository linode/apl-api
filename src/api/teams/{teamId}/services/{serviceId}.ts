import { Operation } from 'express-openapi'

export default function (otomi) {
  const DELETE: Operation = [
    (req, res, next) => {
      console.debug(`Delete service: ${JSON.stringify(req.params)}`)
      const { serviceId } = req.params
      otomi.deleteService(decodeURIComponent(serviceId))
      res.status(200).json({})
    },
  ]
  const GET: Operation = [
    (req, res, next) => {
      console.debug(`Get service: ${JSON.stringify(req.params)}`)
      const { serviceId } = req.params
      const data = otomi.getService(decodeURIComponent(serviceId))
      res.status(200).json(data)
    },
  ]
  const PUT: Operation = [
    (req, res, next) => {
      console.debug(`Modify service: ${JSON.stringify(req.params)}`)
      const { serviceId } = req.params
      const data = otomi.editService(decodeURIComponent(serviceId), req.body)
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
