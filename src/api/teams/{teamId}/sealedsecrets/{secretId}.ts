import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, SealedSecret } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:sealedsecrets')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { teamId, secretId } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteSealedSecret(${secretId})`)
      await otomi.deleteSealedSecret(decodeURIComponent(teamId), decodeURIComponent(secretId))
      res.json({})
    },
  ]
  const get: Operation = [
    async ({ otomi, params: { teamId, secretId } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`getSealedSecret(${secretId})`)
      const data = await otomi.getSealedSecret(decodeURIComponent(teamId), decodeURIComponent(secretId))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, secretId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editSealedSecret(${secretId})`)
      const data = await otomi.editSealedSecret(decodeURIComponent(secretId), {
        ...body,
        teamId: decodeURIComponent(teamId),
      } as SealedSecret)
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
