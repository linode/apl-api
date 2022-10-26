import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:teams')

export default function (): OperationHandlerArray {
  const del: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`deleteTeam(${teamId})`)
      otomi.deleteTeam(teamId)
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
    ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): void => {
      debug(`editTeam(${teamId})`)
      const data = otomi.editTeam(teamId, body)
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
