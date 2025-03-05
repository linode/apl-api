import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:apps')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId }, query: { picks } }: OpenApiRequestExt, res): void => {
      res.json(otomi.getApps(teamId, picks as string[]))
    },
  ]
  const put: Operation = [
    async ({ otomi, body: { ids, enabled }, params: { teamId } }: OpenApiRequestExt, res): Promise<void> => {
      debug('toggleApps')
      await otomi.toggleApps(teamId, ids as string[], enabled as boolean)
      res.end()
    },
  ]
  const api = {
    get,
    put,
  }
  return api
}
