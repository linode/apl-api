import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { AplCodeRepoRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:codeRepos')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeamCodeRepos(${teamId})`)
      const v = otomi.getTeamAplCodeRepos(decodeURIComponent(teamId))
      res.json(v)
    },
  ]
  const post: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`createCodeRepos(${teamId}, ...)`)
      const v = await otomi.createAplCodeRepo(decodeURIComponent(teamId), body as AplCodeRepoRequest)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }

  return api
}
