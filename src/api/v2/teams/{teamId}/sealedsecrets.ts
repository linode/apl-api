import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { AplSecretRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:sealedsecrets')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getSealedSecrets(${teamId})`)
      const v = otomi.getSealedSecrets(decodeURIComponent(teamId))
      res.json(v)
    },
  ]
  const post: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`createSealedSecret(${teamId}, ...)`)
      const v = await otomi.createAplSealedSecret(decodeURIComponent(teamId), body as AplSecretRequest)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }
  return api
}
