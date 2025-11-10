import Debug from 'debug'
import { Response } from 'express'
import { AplServiceRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:services')

/**
 * GET /v2/teams/{teamId}/services
 * Get all services for a team (APL format)
 */
export const getTeamAplServices = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.params
  debug(`getTeamServices(${teamId})`)
  const v = req.otomi.getTeamAplServices(decodeURIComponent(teamId))
  res.json(v)
}

/**
 * POST /v2/teams/{teamId}/services
 * Create a new service (APL format)
 */
export const createAplService = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`createService(${teamId}, ...)`)
  const v = await req.otomi.createAplService(decodeURIComponent(teamId), req.body as AplServiceRequest)
  res.json(v)
}
