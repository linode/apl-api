import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../../otomi-stack'
import { OpenApiRequest } from '../../otomi-models'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    ({ params: { setting } }: OpenApiRequest, res): void => {
      console.debug(`Get settings: ${JSON.stringify({ setting })}`)
      // Hacky work-around because can't use oneOf in OpenAPI Schema object
      res.json({ [setting]: otomi.getSetting(setting) })
    },
  ]
  const PUT: Operation = [
    ({ params: { setting }, body }: OpenApiRequest, res): void => {
      console.debug(`Modify settings: ${JSON.stringify({ [setting]: body })}`)
      res.json(otomi.setSetting('settings', body, setting))
    },
  ]
  const api = {
    GET,
    PUT,
  }
  return api
}
