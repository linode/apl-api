import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, SessionUser, User } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:users')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, user: sessionUser, params: { userId } }: OpenApiRequestExt, res): void => {
      debug(`getUser(${userId})`)
      const data = otomi.getUser(decodeURIComponent(userId), sessionUser)
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { userId }, user, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editUser(${userId})`)
      const data = await otomi.editUser(decodeURIComponent(userId), body as User, user as SessionUser)
      res.json(data)
    },
  ]
  const del: Operation = [
    async ({ otomi, params: { userId } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteUser(${userId})`)
      await otomi.deleteUser(decodeURIComponent(userId))
      res.json({})
    },
  ]
  const api = {
    get,
    put,
    delete: del,
  }
  return api
}
