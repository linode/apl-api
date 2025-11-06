import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:apps')

/**
 * GET /v1/apps/{teamId}
 * Get apps for a team
 */
export const getApps = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.params
  const { picks } = req.query
  res.json(req.otomi.getApps(teamId, picks as string[]))
}

/**
 * PUT /v1/apps/{teamId}
 * Toggle apps for a team
 */
export const toggleApps = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  const { ids, enabled } = req.body
  debug('toggleApps')
  await req.otomi.toggleApps(teamId, ids as string[], enabled as boolean)
  res.end()
}
