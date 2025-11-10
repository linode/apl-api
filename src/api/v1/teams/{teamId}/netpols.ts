import Debug from 'debug'
import { Response } from 'express'
import { Netpol, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:netpols')

/**
 * GET /v1/teams/{teamId}/netpols
 * Get all network policies for a team
 */
export const getTeamNetpols = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.params
  debug(`getTeamNetpols(${teamId})`)
  const v = req.otomi.getTeamNetpols(teamId)
  res.json(v)
}

/**
 * POST /v1/teams/{teamId}/netpols
 * Create a new network policy
 */
export const createNetpol = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`createNetpol(${teamId}, ...)`)
  const v = await req.otomi.createNetpol(teamId, req.body as Netpol)
  res.json(v)
}
