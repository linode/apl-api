import Debug from 'debug'
import { Response } from 'express'
import { AplNetpolRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:netpols')

/**
 * GET /v2/teams/{teamId}/netpols
 * Get all network policies for a team (APL format)
 */
export const getTeamAplNetpols = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.params
  debug(`getTeamNetpols(${teamId})`)
  const v = req.otomi.getTeamAplNetpols(decodeURIComponent(teamId))
  res.json(v)
}

/**
 * POST /v2/teams/{teamId}/netpols
 * Create a new network policy (APL format)
 */
export const createAplNetpol = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`createNetpol(${teamId}, ...)`)
  const v = await req.otomi.createAplNetpol(decodeURIComponent(teamId), req.body as AplNetpolRequest)
  res.json(v)
}
