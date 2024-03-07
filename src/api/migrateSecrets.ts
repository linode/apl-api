import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:migrateSecrets')

export default function (): OperationHandlerArray {
  const post: Operation = [
    async ({ otomi }: OpenApiRequestExt, res): Promise<void> => {
      debug()
      const v = await otomi.migrateSecrets()
      res.json(v)
    },
  ]
  const api = {
    post,
  }
  return api
}
