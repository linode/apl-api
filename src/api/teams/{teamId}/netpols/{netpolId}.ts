import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Netpol } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:netpols')

export default function (): OperationHandlerArray {
  const del: Operation = [
    ({ otomi, params: { netpolId } }: OpenApiRequestExt, res): void => {
      debug(`deleteNetpol(${netpolId})`)
      otomi.deleteNetpol(decodeURIComponent(netpolId))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { netpolId } }: OpenApiRequestExt, res): void => {
      debug(`getNetpol(${netpolId})`)
      const data = otomi.getNetpol(decodeURIComponent(netpolId))
      res.json(data)
    },
  ]
  const put: Operation = [
    ({ otomi, params: { teamId, netpolId }, body }: OpenApiRequestExt, res): void => {
      debug(`editNetpol(${netpolId})`)
      const data = otomi.editNetpol(decodeURIComponent(netpolId), {
        ...body,
        teamId: decodeURIComponent(teamId),
      } as Netpol)
      res.json(data)
    },
  ]
  const api = {
    delete: del,
    get,
    put,
  }
  return api
}
