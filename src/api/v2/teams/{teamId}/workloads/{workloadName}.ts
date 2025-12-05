import Debug from 'debug'
import { Response } from 'express'
import { AplWorkloadRequest, DeepPartial, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:workloads')

/**
 * GET /v2/teams/{teamId}/workloads/{workloadName}
 * Get a specific workload (APL format)
 */
export const getAplWorkload = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId, workloadName } = req.params
  debug(`getWorkload(${workloadName})`)
  const data = req.otomi.getAplWorkload(decodeURIComponent(teamId), decodeURIComponent(workloadName))
  res.json(data)
}

/**
 * PUT /v2/teams/{teamId}/workloads/{workloadName}
 * Edit a workload (APL format)
 */
export const editAplWorkload = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, workloadName } = req.params
  debug(`editWorkload(${workloadName})`)
  const data = await req.otomi.editAplWorkload(
    decodeURIComponent(teamId),
    decodeURIComponent(workloadName),
    req.body as AplWorkloadRequest,
  )
  res.json(data)
}

/**
 * PATCH /v2/teams/{teamId}/workloads/{workloadName}
 * Partially update a workload (APL format)
 */
export const patchAplWorkload = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, workloadName } = req.params
  debug(`editWorkload(${workloadName}, patch)`)
  const data = await req.otomi.editAplWorkload(
    decodeURIComponent(teamId),
    decodeURIComponent(workloadName),
    req.body as DeepPartial<AplWorkloadRequest>,
    true,
  )
  res.json(data)
}

/**
 * DELETE /v2/teams/{teamId}/workloads/{workloadName}
 * Delete a workload
 */
export const deleteAplWorkload = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, workloadName } = req.params
  debug(`deleteWorkload(${workloadName})`)
  await req.otomi.deleteWorkload(decodeURIComponent(teamId), decodeURIComponent(workloadName))
  res.json({})
}
