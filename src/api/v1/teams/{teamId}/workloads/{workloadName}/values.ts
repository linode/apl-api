import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt, WorkloadValues } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:workloadValues')

/**
 * GET /v1/teams/{teamId}/workloads/{workloadName}/values
 * Get workload values
 */
export const getWorkloadValues = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId, workloadName } = req.params
  debug(`getWorkloadValues(${workloadName})`)
  const data = req.otomi.getWorkloadValues(decodeURIComponent(teamId), decodeURIComponent(workloadName))
  res.json(data)
}

/**
 * PUT /v1/teams/{teamId}/workloads/{workloadName}/values
 * Update workload values
 */
export const editWorkloadValues = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, workloadName } = req.params
  debug(`putWorkloadValues(${workloadName})`)
  const data = await req.otomi.editWorkloadValues(decodeURIComponent(teamId), decodeURIComponent(workloadName), {
    ...req.body,
  } as WorkloadValues)
  res.json(data)
}
