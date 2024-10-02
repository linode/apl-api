import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, User } from 'src/otomi-models'

const debug = Debug('otomi:api:users')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi }: OpenApiRequestExt, res): void => {
      debug('getAllUsers')
      const v = otomi.getAllUsers()
      res.json(v)
    },
  ]
  const post: Operation = [
    async ({ otomi, user: sessionUser, body }: OpenApiRequestExt, res): Promise<void> => {
      debug('createUser')
      const v = await otomi.createUser(sessionUser, body as User)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }
  return api
}
