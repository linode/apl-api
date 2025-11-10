import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:session')

/**
 * GET /v1/session
 * Get current session information
 */
export const getSession = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('getSession')
  const data = await req.otomi.getSession(req.user)
  res.json(data)
}
