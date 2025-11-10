import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:policies')

/**
 * GET /v1/teams/{teamId}/policies
 * Get all policies for a team
 */
export const getTeamPolicies = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.params
  debug(`getTeamPolicies(${teamId})`)
  const v = req.otomi.getTeamPolicies(teamId)
  res.json(v)
}
