import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:policies')

/**
 * GET /v2/teams/{teamId}/policies
 * Get all policies for a team (APL format)
 */
export const getTeamAplPolicies = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.params
  debug(`getTeamPolicies(${teamId})`)
  const v = req.otomi.getTeamAplPolicies(decodeURIComponent(teamId))
  res.json(v)
}
