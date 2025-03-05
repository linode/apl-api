import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:secrets')

export default function (): OperationHandlerArray {
  const get: Operation = [
    async ({ otomi, params: { teamId } }: OpenApiRequestExt, res): Promise<void> => {
      debug('getSecretsFromK8s')
      const v = await otomi.getSecretsFromK8s(teamId)
      res.json(v)
    },
  ]
  const api = {
    get,
  }
  return api
}
