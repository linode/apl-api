import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:session')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, user }: OpenApiRequestExt, res): void => {
      debug('getSession')
      const data = otomi.getSession(user)
      res.json(data)
    },
  ]
  const api = {
    get,
  }
  return api
}
