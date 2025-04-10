import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { Build, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:builds')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeamBuilds(${teamId})`)
      const v = otomi.getTeamBuilds(teamId)
      res.json(v)
    },
  ]
  const post: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`createBuild(${teamId}, ...)`)
      const v = await otomi.createBuild(teamId, body as Build)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }

  return api
}
