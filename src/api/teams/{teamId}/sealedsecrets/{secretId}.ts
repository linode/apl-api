import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, SealedSecret } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:sealedsecrets')

export default function (): OperationHandlerArray {
  const del: Operation = [
    ({ otomi, params: { secretId } }: OpenApiRequestExt, res): void => {
      debug(`deleteSealedSecret(${secretId})`)
      otomi.deleteSealedSecret(decodeURIComponent(secretId))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { secretId } }: OpenApiRequestExt, res): void => {
      debug(`getSealedSecret(${secretId})`)
      console.log('getSealedSecret secretId', secretId)
      const data = otomi.getSealedSecret(decodeURIComponent(secretId))
      res.json(data)
    },
  ]
  const put: Operation = [
    ({ otomi, params: { teamId, secretId }, body }: OpenApiRequestExt, res): void => {
      debug(`editSealedSecret(${secretId})`)
      const data = otomi.editSealedSecret(decodeURIComponent(secretId), {
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
