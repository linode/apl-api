import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Secret } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:secrets')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getSecrets(${teamId})`)
      const v = otomi.getSecrets(teamId)
      res.json(v)
    },
  ]
  const post: Operation = [
    ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): void => {
      debug(`createSecret(${teamId}, ...)`)
      const v = otomi.createSecret(teamId, body as Secret)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }
  return api
}
