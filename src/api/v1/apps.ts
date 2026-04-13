import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:apps')

/**
 * GET /v1/apps
 * Get all apps across all teams
 * Returns list of all apps with their ids and enabled status
 */
export const getApps = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('getAllApps')
  res.json(await req.otomi.getApps())
}
