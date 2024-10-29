import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { unset } from 'lodash'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:settings')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, query: { ids } }: OpenApiRequestExt, res): void => {
      debug(`getSettings(${ids})`)
      const v = otomi.getSettings(ids as string[] | undefined)
      unset(v, 'otomi.adminPassword')
      res.json(v)
    },
  ]
  const api = {
    get,
  }
  return api
}
