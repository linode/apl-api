import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../../otomi-stack'
import { OpenApiRequest } from '../../otomi-models'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    ({ params: { setting } }: OpenApiRequest, res): void => {
      // Hacky work-around (`[setting]: obj`) because one can't use oneOf directly in OpenAPI Schema object
      // TODO https://stackoverflow.com/a/64467369/8357826
      res.json({ [setting]: otomi.getSetting(setting) })
    },
  ]
  const PUT: Operation = [
    ({ params: { setting }, body }: OpenApiRequest, res): void => {
      res.json(otomi.setSetting(body, setting))
    },
  ]
  const api = {
    GET,
    PUT,
  }
  return api
}
