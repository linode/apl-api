import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:session')

export default function (): OperationHandlerArray {
  const get: Operation = [
    async ({ otomi, user }: OpenApiRequestExt, res): Promise<void> => {
      debug('getSession')
      const data = await otomi.getSession(user)
      res.json(data)
    },
  ]
  const api = {
    get,
  }
  return api
}
