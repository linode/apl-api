import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:user:logout')

/**
 * POST /v2/user/logout
 * Log out the current session.
 */
export const logout = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug(`logout(${req.user.sub})`)
  await req.otomi.logout(req.user)
  res.status(204).end()
}
