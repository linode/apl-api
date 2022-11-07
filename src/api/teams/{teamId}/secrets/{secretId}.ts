import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Secret } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:secrets')

export default function (): OperationHandlerArray {
  const del: Operation = [
    ({ otomi, params: { secretId } }: OpenApiRequestExt, res): void => {
      debug(`deleteSecret(${secretId})`)
      otomi.deleteSecret(decodeURIComponent(secretId))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { secretId } }: OpenApiRequestExt, res): void => {
      debug(`getSecret(${secretId})`)
      const data = otomi.getSecret(decodeURIComponent(secretId))
      res.json(data)
    },
  ]
  const put: Operation = [
    ({ otomi, params: { teamId, secretId }, body }: OpenApiRequestExt, res): void => {
      debug(`editSecret(${secretId})`)
      const data = otomi.editSecret(decodeURIComponent(secretId), {
        ...body,
        teamId: decodeURIComponent(teamId),
      } as Secret)
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
