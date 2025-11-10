import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt, Workload } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:workloads')

/**
 * GET /v1/teams/{teamId}/workloads
 * Get all workloads for a team
 */
export const getTeamWorkloads = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.params
  debug(`getTeamWorkloads(${teamId})`)
  const v = req.otomi.getTeamWorkloads(teamId)
  res.json(v)
}

/**
 * POST /v1/teams/{teamId}/workloads
 * Create a new workload
 */
export const createWorkload = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`createWorkload(${teamId}, ...)`)
  const v = await req.otomi.createWorkload(teamId, req.body as Workload)
  res.json(v)
}
