import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, SealedSecret } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:sealedsecrets')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getSealedSecrets(${teamId})`)
      const v = otomi.getSealedSecrets(teamId)
      console.log('getSealedSecrets', v)
      res.json(v)
    },
  ]
  const post: Operation = [
    ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): void => {
      debug(`createSealedSecret(${teamId}, ...)`)
      const v = otomi.createSealedSecret(teamId, body as SealedSecret)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }
  return api
}
