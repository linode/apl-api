import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:services')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeamServices(${teamId})`)
      const v = otomi.getTeamServices(teamId)
      res.json(v)
    },
  ]
  const post: Operation = [
    ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): void => {
      debug(`createService(${teamId}, ...)`)
      const v = otomi.createService(teamId, body)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }

  return api
}
