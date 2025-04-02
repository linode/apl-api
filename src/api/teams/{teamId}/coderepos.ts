import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { CodeRepo, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:codeRepos')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeamCodeRepos(${teamId})`)
      const v = otomi.getTeamCodeRepos(teamId)
      res.json(v)
    },
  ]
  const post: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`createCodeRepos(${teamId}, ...)`)
      const v = await otomi.createCodeRepo(teamId, body as CodeRepo)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }

  return api
}
