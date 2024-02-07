import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Netpol } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:netpols')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeamNetpols(${teamId})`)
      const v = otomi.getTeamNetpols(teamId)
      res.json(v)
    },
  ]
  const post: Operation = [
    ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): void => {
      debug(`createNetpol(${teamId}, ...)`)
      const v = otomi.createNetpol(teamId, body as Netpol)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }

  return api
}
