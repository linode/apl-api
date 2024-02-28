import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { MigrateSecrets, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:migrateSecrets')

export default function (): OperationHandlerArray {
  const post: Operation = [
    async ({ otomi, body }: OpenApiRequestExt, res): Promise<void> => {
      debug()
      const v = await otomi.migrateSecrets(body as MigrateSecrets)
      res.json(v)
    },
  ]
  const api = {
    post,
  }
  return api
}
