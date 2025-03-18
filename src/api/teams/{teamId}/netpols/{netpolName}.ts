import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { Netpol, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:netpols')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { teamId, netpolName } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteNetpol(${netpolName})`)
      await otomi.deleteNetpol(decodeURIComponent(teamId), decodeURIComponent(netpolName))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { teamId, netpolName } }: OpenApiRequestExt, res): void => {
      debug(`getNetpol(${netpolName})`)
      const data = otomi.getNetpol(decodeURIComponent(teamId), decodeURIComponent(netpolName))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, netpolName }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editNetpol(${netpolName})`)
      const data = await otomi.editNetpol(decodeURIComponent(teamId), decodeURIComponent(netpolName), {
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
