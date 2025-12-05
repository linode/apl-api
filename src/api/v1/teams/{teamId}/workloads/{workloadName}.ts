import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt, Workload } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:workloads')

/**
 * GET /v1/teams/{teamId}/workloads/{workloadName}
 * Get a specific workload
 */
export const getWorkload = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId, workloadName } = req.params
  debug(`getWorkload(${workloadName})`)
  const data = req.otomi.getWorkload(decodeURIComponent(teamId), decodeURIComponent(workloadName))
  res.json(data)
}

/**
 * PUT /v1/teams/{teamId}/workloads/{workloadName}
 * Edit a workload
 */
export const editWorkload = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, workloadName } = req.params
  debug(`editWorkload(${workloadName})`)
  const data = await req.otomi.editWorkload(decodeURIComponent(teamId), decodeURIComponent(workloadName), {
    ...req.body,
  } as Workload)
  res.json(data)
}

/**
 * DELETE /v1/teams/{teamId}/workloads/{workloadName}
 * Delete a workload
 */
export const deleteWorkload = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, workloadName } = req.params
  debug(`deleteWorkload(${workloadName})`)
  await req.otomi.deleteWorkload(decodeURIComponent(teamId), decodeURIComponent(workloadName))
  res.json({})
}
