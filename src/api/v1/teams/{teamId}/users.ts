import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt, SessionUser, User } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:users')
type UserBasicInfo = Pick<User, 'id' | 'email' | 'isPlatformAdmin' | 'isTeamAdmin' | 'teams'>

/**
 * PUT /v1/teams/{teamId}/users
 * Edit team users
 */
export const editTeamUsers = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`editTeamUsers(${teamId})`)
  const v = await req.otomi.editTeamUsers(req.body as UserBasicInfo[], req.user as SessionUser)
  res.json(v)
}
