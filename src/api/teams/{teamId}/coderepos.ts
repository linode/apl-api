import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { Coderepo, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:coderepos')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeamCoderepos(${teamId})`)
      const v = otomi.getTeamCoderepos(teamId)
      res.json(v)
    },
  ]
  const post: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`createCoderepos(${teamId}, ...)`)
      const v = await otomi.createCoderepo(teamId, body as Coderepo)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }

  return api
}
