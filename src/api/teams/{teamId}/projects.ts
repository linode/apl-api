import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Project } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:projects')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeamProjects(${teamId})`)
      const v = otomi.getTeamProjects(teamId)
      res.json(v)
    },
  ]
  const post: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`createProject(${teamId}, ...)`)
      const v = await otomi.createProject(teamId, body as Project)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }

  return api
}
