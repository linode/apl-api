import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, User } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:users')

export default function (): OperationHandlerArray {
  const put: Operation = [
    ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): void => {
      debug(`editTeamUsers(${teamId})`)
      const v = otomi.editTeamUsers(body as User[])
      res.json(v)
    },
  ]
  const api = {
    put,
  }

  return api
}
