import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt, SessionUser, User } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:users')

/**
 * GET /v1/users/{userId}
 * Get a specific user
 */
export const getUser = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { userId } = req.params
  debug(`getUser(${userId})`)
  const data = await req.otomi.getUser(decodeURIComponent(userId), req.user)
  res.json(data)
}

/**
 * PUT /v1/users/{userId}
 * Edit a user
 */
export const editUser = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { userId } = req.params
  debug(`editUser(${userId})`)
  const data = await req.otomi.editUser(decodeURIComponent(userId), req.body as User, req.user as SessionUser)
  res.json(data)
}

/**
 * DELETE /v1/users/{userId}
 * Delete a user
 */
export const deleteUser = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { userId } = req.params
  debug(`deleteUser(${userId})`)
  await req.otomi.deleteUser(decodeURIComponent(userId))
  res.json({})
}
