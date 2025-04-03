import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Team } from 'src/otomi-models'

const debug = Debug('otomi:api:teams')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, user }: OpenApiRequestExt, res): void => {
      debug('getTeams', user)
      // we filter admin team here as it is not for console
      const teams = (otomi.getTeams() || [])
        .filter((t) => t.id !== 'admin')
        .map(({ password: _password, ...teamWithoutPassword }) => teamWithoutPassword)

      res.json(teams)
    },
  ]
  const post: Operation = [
    async ({ otomi, body }: OpenApiRequestExt, res): Promise<void> => {
      debug('createTeam')
      const data = await otomi.createTeam(body as Team)
      res.json(data)
    },
  ]
  const api = {
    get,
    post,
  }
  return api
}
