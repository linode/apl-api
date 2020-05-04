import { Operation } from 'express-openapi'

export const parameters = []

export default function (otomi) {
  const GET: Operation = [
    /* business middleware not expressible by OpenAPI documentation goes here */
    (req, res, next) => {
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
