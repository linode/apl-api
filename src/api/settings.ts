import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:settings')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, query: { ids } }: OpenApiRequestExt, res): void => {
      debug(`getSettings(${ids})`)
      const v = otomi.getSettings(ids as string[] | undefined)
      if (v?.otomi) {
        const { otomi: otomiSettings, ...restSettings } = v
        // Remove the otomi.adminPassword from otomi settings response
        const { adminPassword, ...restOtomiSettings } = otomiSettings
        res.json({ ...restSettings, otomi: restOtomiSettings })
      } else res.json(v)
    },
  ]
  const api = {
    get,
  }
  return api
}
