import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, SealedSecret } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:sealedsecrets')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getSealedSecrets(${teamId})`)
      const v = otomi.getSealedSecrets(teamId)
      res.json(v)
    },
  ]
  const post: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`createSealedSecret(${teamId}, ...)`)
      const v = await otomi.createSealedSecret(teamId, body as SealedSecret)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }
  return api
}
