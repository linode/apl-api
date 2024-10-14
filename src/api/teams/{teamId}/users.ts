import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, User } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:users')
type UserBasicInfo = Pick<User, 'id' | 'email' | 'isPlatformAdmin' | 'isTeamAdmin' | 'teams'>

export default function (): OperationHandlerArray {
  const put: Operation = [
    ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): void => {
      debug(`editTeamUsers(${teamId})`)
      const v = otomi.editTeamUsers(body as UserBasicInfo[])
      res.json(v)
    },
  ]
  const api = {
    put,
  }

  return api
}
