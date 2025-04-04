import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, User } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:users')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, user: sessionUser }: OpenApiRequestExt, res): void => {
      debug('getAllUsers')
      const v = otomi.getAllUsers(sessionUser)
      res.json(v)
    },
  ]
  const post: Operation = [
    async ({ otomi, body }: OpenApiRequestExt, res): Promise<void> => {
      debug('createUser')
      const v = await otomi.createUser(body as User)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }
  return api
}
