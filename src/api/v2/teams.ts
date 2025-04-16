import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { AplTeamSettingsRequest, OpenApiRequestExt } from 'src/otomi-models'
import { unset } from 'lodash'

const debug = Debug('otomi:api:v2:teams')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi }: OpenApiRequestExt, res): void => {
      debug('getTeams')
      // we filter admin team here as it is not for console
      const teams = (otomi.getAplTeams() || [])
        .filter((t) => t.metadata.name !== 'admin')
        .map((team) => unset(team, 'team.spec.password'))

      res.json(teams)
    },
  ]
  const post: Operation = [
    async ({ otomi, body }: OpenApiRequestExt, res): Promise<void> => {
      debug('createTeam')
      const data = await otomi.createAplTeam(body as AplTeamSettingsRequest)
      res.json(data)
    },
  ]
  const api = {
    get,
    post,
  }
  return api
}
