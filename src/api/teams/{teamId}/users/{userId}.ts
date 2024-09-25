import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, User } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:users')

export default function (): OperationHandlerArray {
  const del: Operation = [
    ({ otomi, params: { userId } }: OpenApiRequestExt, res): void => {
      debug(`deleteUser(${userId})`)
      otomi.deleteUser(decodeURIComponent(userId))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { userId } }: OpenApiRequestExt, res): void => {
      debug(`getUser(${userId})`)
      const data = otomi.getUser(decodeURIComponent(userId))
      res.json(data)
    },
  ]
  const put: Operation = [
    ({ otomi, params: { teamId, userId }, body }: OpenApiRequestExt, res): void => {
      debug(`editUser(${userId})`)
      const data = otomi.editUser(decodeURIComponent(userId), {
        ...body,
        teamId: decodeURIComponent(teamId),
      } as User)
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
