import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt, Team } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams')

/**
 * GET /v1/teams
 * Get teams collection
 */
export const getTeams = (req: OpenApiRequestExt, res: Response): void => {
  debug('getTeams')
  // we filter admin team here as it is not for console
  const teams = (req.otomi.getTeams() || [])
    .filter((t) => t.id !== 'admin')
    .map(({ password: _password, ...teamWithoutPassword }) => teamWithoutPassword)

  res.json(teams)
}

/**
 * POST /v1/teams
 * Create a team
 */
export const createTeam = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('createTeam')
  const data = await req.otomi.createTeam(req.body as Team)
  res.json(data)
}
