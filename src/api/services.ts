import { Operation } from 'express-openapi'

export default function (otomi) {
  const GET: Operation = [
    /* business middleware not expressible by OpenAPI documentation goes here */
    (req, res) => {
      console.debug('Get all services')
      const v = otomi.getAllServices()
      res.status(200).json(v)
    },
  ]
  const api = {
    GET,
  }
  return api
}
