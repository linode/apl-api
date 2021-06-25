import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../../otomi-stack'
import { OpenApiRequest } from '../../otomi-models'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    ({ params: { setting } }: OpenApiRequest, res): void => {
      // Hacky work-around (`[setting]: obj`) because one can't use oneOf directly in OpenAPI Schema object
      // TODO https://stackoverflow.com/a/64467369/8357826
      const resBody = { [setting]: otomi.getSetting(setting) }
      if (res.json(resBody)) console.debug(`DEBUG response: ${JSON.stringify(resBody, null, 2)}`)
    },
  ]
  const PUT: Operation = [
    ({ params: { setting }, body }: OpenApiRequest, res): void => {
      const payload = otomi.setSetting(body, setting)
      if (res.json(payload)) console.debug(`DEBUG payload: ${JSON.stringify(payload, null, 2)}`)
    },
  ]
  const api = {
    GET,
    PUT,
  }
  return api
}
