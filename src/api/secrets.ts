import { Operation } from 'express-openapi'
import OtomiStack from '../otomi-stack'

export default function (otomi: OtomiStack) {
  const GET: Operation = [
    /* business middleware not expressible by OpenAPI documentation goes here */
    (req, res) => {
      console.debug('Get all secrets')
      const v = otomi.getAllSecrets()
      res.status(200).json(v)
    },
  ]
  const api = {
    GET,
  }
  return api
}
