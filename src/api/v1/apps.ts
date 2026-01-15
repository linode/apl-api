import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:apps')

/**
 * GET /v1/apps
 * Get all apps across all teams
 * Returns list of apps with their ids and enabled status
 */
export const getApps = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.query as { teamId: string }
  debug('getApps', teamId)
  res.json(req.otomi.getApps(teamId))
}
