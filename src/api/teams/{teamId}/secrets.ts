import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:secrets')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getSecrets(${teamId})`)
      res.json('not implemented')
    },
  ]
  const post: Operation = [
    ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): void => {
      debug(`createSecret(${teamId}, ...)`)
      res.json('not implemented')
    },
  ]
  const api = {
    get,
    post,
  }
  return api
}
