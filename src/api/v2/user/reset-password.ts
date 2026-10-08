import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt, ResetPasswordRequest } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:user:reset-password')

/**
 * POST /v2/user/reset-password
 * Self-service password reset for the caller's own account.
 */
export const resetOwnPassword = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug(`resetOwnPassword(${req.user.sub})`)
  const { currentPassword, newPassword } = req.body as ResetPasswordRequest
  await req.otomi.resetOwnPassword(req.user, currentPassword, newPassword)
  res.status(204).end()
}
