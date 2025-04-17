import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { AplTeamSettingsRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { teamId } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteTeam(${teamId})`)
      await otomi.deleteTeam(teamId)
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeam(${teamId})`)
      const data = otomi.getAplTeam(teamId)
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editTeam(${teamId})`)
      const data = await otomi.editAplTeam(teamId, body as AplTeamSettingsRequest)
      res.json(data)
    },
  ]
  const patch: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editTeam(${teamId}, patch)`)
      const data = await otomi.editAplTeam(teamId, body as AplTeamSettingsRequest, true)
      res.json(data)
    },
  ]
  const api = {
    delete: del,
    get,
    put,
    patch,
  }
  return api
}
