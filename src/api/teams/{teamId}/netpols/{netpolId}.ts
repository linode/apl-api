import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { Netpol, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:netpols')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { teamId, netpolId } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteNetpol(${netpolId})`)
      await otomi.deleteNetpol(decodeURIComponent(teamId), decodeURIComponent(netpolId))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { teamId, netpolId } }: OpenApiRequestExt, res): void => {
      debug(`getNetpol(${netpolId})`)
      const data = otomi.getNetpol(decodeURIComponent(teamId), decodeURIComponent(netpolId))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, netpolId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editNetpol(${netpolId})`)
      const data = await otomi.editNetpol(decodeURIComponent(teamId), decodeURIComponent(netpolId), {
        ...body,
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
