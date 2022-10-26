import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:settings')

export default function (): OperationHandlerArray {
  const put: Operation = [
    ({ otomi, body, params: { settingId } }: OpenApiRequestExt, res): void => {
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
