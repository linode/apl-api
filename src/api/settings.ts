import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:settings')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, query: { ids } }: OpenApiRequestExt, res): void => {
      debug(`getSettings(${ids})`)
      res.json(otomi.getSettings(ids as string[] | undefined))
    },
  ]
  const api = {
    get,
  }
  return api
}
