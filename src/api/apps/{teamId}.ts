import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:apps')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      res.json(otomi.getApps(teamId))
    },
  ]
  const put: Operation = [
    ({ otomi, body: { ids, enabled }, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug('toggleApps')
      otomi.toggleApps(teamId, ids as string[], enabled as boolean)
      res.end()
    },
  ]
  const api = {
    get,
    put,
  }
  return api
}
