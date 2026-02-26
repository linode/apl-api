import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt, User } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:users')

/**
 * GET /v1/users
 * Get all users
 */
export const getAllUsers = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('getAllUsers')
  const v = await req.otomi.getAllUsers(req.user)
  res.json(v)
}

/**
 * POST /v1/users
 * Create a new user
 */
export const createUser = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('createUser')
  const v = await req.otomi.createUser(req.body as User)
  res.json(v)
}
