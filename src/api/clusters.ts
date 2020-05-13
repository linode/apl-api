import { Operation } from 'express-openapi'

export default function (otomi) {
  const GET: Operation = [
    /* business middleware not expressible by OpenAPI documentation goes here */
    (req, res) => {
      console.info(`Get clusters: ${JSON.stringify(req.params)}`)
      const data = otomi.getClusters(req.params)

      res.status(200).json(data)
    },
  ]
  const api = {
    GET,
  }
  return api
}
