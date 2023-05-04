import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Build } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:builds')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeamBuilds(${teamId})`)
      const v = otomi.getTeamBuilds(teamId)
      res.json(v)
    },
  ]
  const post: Operation = [
    ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): void => {
      debug(`createBuild(${teamId}, ...)`)
      const v = otomi.createBuild(teamId, body as Build)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }

  return api
}
