import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Team } from 'src/otomi-models'

const debug = Debug('otomi:api:teams')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi }: OpenApiRequestExt, res): void => {
      debug('getTeams')
      // we filter admin team here as it is not for console
      const teams = (otomi.getTeams() || [])
        .filter((t) => t.id !== 'admin')
        .map(({ password: _password, ...teamWithoutPassword }) => teamWithoutPassword)

      res.json(teams)
    },
  ]
  const post: Operation = [
    ({ otomi, body }: OpenApiRequestExt, res): void => {
      debug('createTeam')
      const data = otomi.createTeam(body as Team)
      res.json(data)
    },
  ]
  const api = {
    get,
    post,
  }
  return api
}
