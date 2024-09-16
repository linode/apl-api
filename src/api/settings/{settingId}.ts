import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Settings } from 'src/otomi-models'

const debug = Debug('otomi:api:settings')

export default function (): OperationHandlerArray {
  const put: Operation = [
    async ({ otomi, body, params: { settingId } }: OpenApiRequestExt, res): Promise<void> => {
      const ids = Object.keys(body as Settings)
      debug(`editSettings(${ids.join(',')})`)
      const v = await otomi.editSettings(body as Settings, settingId)
      res.json(v)
    },
  ]
  const api = {
    put,
  }
  return api
}
