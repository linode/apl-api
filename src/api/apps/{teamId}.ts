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
    ({ otomi, body, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug('toggleApps')
      otomi.toggleApps(teamId, body)
      res.end()
    },
  ]
  const api = {
    get,
    put,
  }
  return api
}
