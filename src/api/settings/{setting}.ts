import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../../otomi-stack'
import { OpenApiRequest } from '../../otomi-models'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    ({ params: { setting } }: OpenApiRequest, res): void => {
      console.debug(`Response: ${JSON.stringify({ setting })}`)
      // Hacky work-around because can't use oneOf in OpenAPI Schema object
      res.json({ [setting]: otomi.getSetting(setting) })
    },
  ]
  const PUT: Operation = [
    ({ params: { setting }, body }: OpenApiRequest, res): void => {
      console.debug(`Payload: ${JSON.stringify({ [setting]: body })}`)
      res.json(otomi.setSetting(body, setting))
    },
  ]
  const api = {
    GET,
    PUT,
  }
  return api
}
