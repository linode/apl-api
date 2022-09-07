import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequest } from '../../otomi-models'
import OtomiStack from '../../otomi-stack'

const debug = Debug('otomi:api:settings')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const put: Operation = [
    ({ body, params: { settingId } }: OpenApiRequest, res): void => {
      const ids = Object.keys(body)
      debug(`editSettings(${ids.join(',')})`)
      res.json(otomi.editSettings(body, settingId))
    },
  ]
  const api = {
    put,
  }
  return api
}
