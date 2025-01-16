import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Team } from 'src/otomi-models'

const debug = Debug('otomi:api:teams')

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
      const data = otomi.getTeam(teamId)
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editTeam(${teamId})`)
      const data = await otomi.editTeam(teamId, body as Team)
      res.json(data)
    },
  ]
  const api = {
    delete: del,
    get,
    put,
  }
  return api
}
