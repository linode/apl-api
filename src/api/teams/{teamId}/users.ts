import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, TeamUser } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:users')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeamUsers(${teamId})`)
      const v = otomi.getTeamUsers(teamId)
      res.json(v)
    },
  ]
  const post: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`createUser(${teamId}, ...)`)
      const v = await otomi.createUser(teamId, body as TeamUser)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }

  return api
}
