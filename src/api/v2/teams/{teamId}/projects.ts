import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { AplProjectRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:projects')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeamProjects(${teamId})`)
      const v = otomi.getTeamAplProjects(decodeURIComponent(teamId))
      res.json(v)
    },
  ]
  const post: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`createProject(${teamId}, ...)`)
      const v = await otomi.createAplProject(teamId, body as AplProjectRequest)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }

  return api
}
