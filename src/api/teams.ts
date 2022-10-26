import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:teams')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi }: OpenApiRequestExt, res): void => {
      debug('getTeams')
      // we filter admin team here as it is not for console
      const data = (otomi.getTeams() || []).filter((t) => t.id !== 'admin')
      res.json(data)
    },
  ]
  const post: Operation = [
    ({ otomi, body }: OpenApiRequestExt, res): void => {
      debug('createTeam')
      const data = otomi.createTeam(body)
      res.json(data)
    },
  ]
  const api = {
    get,
    post,
  }
  return api
}
