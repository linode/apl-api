import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { AplBuildRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:builds')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeamBuilds(${teamId})`)
      const v = otomi.getTeamAplBuilds(decodeURIComponent(teamId))
      res.json(v)
    },
  ]
  const post: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`createBuild(${teamId}, ...)`)
      const v = await otomi.createAplBuild(decodeURIComponent(teamId), body as AplBuildRequest)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }

  return api
}
