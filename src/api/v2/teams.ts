import Debug from 'debug'
import { Response } from 'express'
import { AplTeamSettingsRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams')

/**
 * GET /v2/teams
 * Get teams collection
 */
export const getAplTeams = (req: OpenApiRequestExt, res: Response): void => {
  debug('getTeams')
  // we filter admin team here as it is not for console
  const teams = req.otomi.getAplTeams() || []

  res.json(teams)
}

/**
 * POST /v2/teams
 * Create a team
 */
export const createAplTeam = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('createTeam')
  const data = await req.otomi.createAplTeam(req.body as AplTeamSettingsRequest)
  res.json(data)
}
