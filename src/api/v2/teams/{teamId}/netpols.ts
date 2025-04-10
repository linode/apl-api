import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { AplNetpolRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:netpols')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeamNetpols(${teamId})`)
      const v = otomi.getTeamAplNetpols(decodeURIComponent(teamId))
      res.json(v)
    },
  ]
  const post: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`createNetpol(${teamId}, ...)`)
      const v = await otomi.createAplNetpol(decodeURIComponent(teamId), body as AplNetpolRequest)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }

  return api
}
