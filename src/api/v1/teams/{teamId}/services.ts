import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt, Service } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:services')

/**
 * GET /v1/teams/{teamId}/services
 * Get services from a given team
 */
export const getTeamServices = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.params
  debug(`getTeamServices(${teamId})`)
  const v = req.otomi.getTeamServices(teamId)
  res.json(v)
}

/**
 * POST /v1/teams/{teamId}/services
 * Create a service
 */
export const createService = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`createService(${teamId}, ...)`)
  const v = await req.otomi.createService(teamId, req.body as Service)
  res.json(v)
}
