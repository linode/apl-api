import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { AplSecretRequest, DeepPartial, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:sealedsecrets')

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
      const data = await otomi.getAplSealedSecret(decodeURIComponent(teamId), decodeURIComponent(sealedSecretName))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, sealedSecretName }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editSealedSecret(${sealedSecretName})`)
      const data = await otomi.editAplSealedSecret(
        decodeURIComponent(teamId),
        decodeURIComponent(sealedSecretName),
        body as AplSecretRequest,
      )
      res.json(data)
    },
  ]
  const patch: Operation = [
    async ({ otomi, params: { teamId, sealedSecretName }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editSealedSecret(${sealedSecretName}, patch)`)
      const data = await otomi.editAplSealedSecret(
        decodeURIComponent(teamId),
        decodeURIComponent(sealedSecretName),
        body as DeepPartial<AplSecretRequest>,
        true,
      )
      res.json(data)
    },
  ]
  const api = {
    delete: del,
    get,
    put,
    patch,
  }
  return api
}
