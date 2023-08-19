import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Source } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:sources')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getSources(${teamId})`)
      const v = otomi.getSource(teamId)
      res.json(v)
    },
  ]
  const post: Operation = [
    ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): void => {
      debug(`createSource(${teamId}, ...)`)
      const v = otomi.createSource(teamId, body as Source)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }
  return api
}
