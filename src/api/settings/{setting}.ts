import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../../otomi-stack'
import { OpenApiRequest } from '../../otomi-models'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    ({ params: { setting } }: OpenApiRequest, res): void => {
      console.debug(`Get settings: ${JSON.stringify({ setting })}`)
      res.json(otomi.getSubSetting('settings', setting))
    },
  ]
  const PUT: Operation = [
    ({ params: { setting }, body }: OpenApiRequest, res): void => {
      console.debug(`Modify settings: ${JSON.stringify({ setting })}`)
      res.json(otomi.setSubSetting('settings', body, setting))
    },
  ]
  const api = {
    GET,
    PUT,
  }
  return api
}
