import { Operation } from 'express-openapi'
import OtomiStack from '../otomi-stack'
import { OpenApiRequest } from '../api.d'

export default function (otomi: OtomiStack) {
  const GET: Operation = [
    /* business middleware not expressible by OpenAPI documentation goes here */
    (req: OpenApiRequest, res) => {
      console.info(`Get clusters`)
      const data = otomi.getClusters()

      res.status(200).json(data)
    },
  ]
  const api = {
    GET,
  }
  return api
}
