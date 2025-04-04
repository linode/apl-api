import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { Netpol, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:netpols')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeamNetpols(${teamId})`)
      const v = otomi.getTeamNetpols(teamId)
      res.json(v)
    },
  ]
  const post: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`createNetpol(${teamId}, ...)`)
      const v = await otomi.createNetpol(teamId, body as Netpol)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }

  return api
}
