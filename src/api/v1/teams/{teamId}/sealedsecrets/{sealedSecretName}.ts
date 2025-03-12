import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, SealedSecret } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:sealedsecrets')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { teamId, sealedSecretName } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteSealedSecret(${sealedSecretName})`)
      await otomi.deleteSealedSecret(decodeURIComponent(teamId), decodeURIComponent(sealedSecretName))
      res.json({})
    },
  ]
  const get: Operation = [
    async ({ otomi, params: { teamId, sealedSecretName } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`getSealedSecret(${sealedSecretName})`)
      const data = await otomi.getSealedSecret(decodeURIComponent(teamId), decodeURIComponent(sealedSecretName))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, sealedSecretName }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editSealedSecret(${sealedSecretName})`)
      const data = await otomi.editSealedSecret(decodeURIComponent(sealedSecretName), {
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
