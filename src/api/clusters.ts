import { Operation } from 'express-openapi'

export const parameters = []

export default function (otomi) {
  const get: Operation = [
    /* business middleware not expressible by OpenAPI documentation goes here */
    (req, res, next) => {
      console.info(`Get clusters: ${JSON.stringify(req.params)}`)
      const data = otomi.getClusters(req.params)

      res.status(200).json(data)
    },
  ]
  const api = {
    get,
  }
  return api
}
