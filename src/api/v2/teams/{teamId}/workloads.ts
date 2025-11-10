import Debug from 'debug'
import { Response } from 'express'
import { AplWorkloadRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:workloads')

/**
 * GET /v2/teams/{teamId}/workloads
 * Get all workloads for a team (APL format)
 */
export const getTeamAplWorkloads = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.params
  debug(`getTeamWorkloads(${teamId})`)
  const v = req.otomi.getTeamAplWorkloads(decodeURIComponent(teamId))
  res.json(v)
}

/**
 * POST /v2/teams/{teamId}/workloads
 * Create a new workload (APL format)
 */
export const createAplWorkload = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`createWorkload(${teamId}, ...)`)
  const v = await req.otomi.createAplWorkload(decodeURIComponent(teamId), req.body as AplWorkloadRequest)
  res.json(v)
}
