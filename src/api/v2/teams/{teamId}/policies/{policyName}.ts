import Debug from 'debug'
import { Response } from 'express'
import { AplPolicyRequest, DeepPartial, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:policies')

/**
 * GET /v2/teams/{teamId}/policies/{policyName}
 * Get a specific policy (APL format)
 */
export const getAplPolicy = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId, policyName } = req.params
  debug(`getPolicy(${policyName})`)
  const data = req.otomi.getAplPolicy(decodeURIComponent(teamId), decodeURIComponent(policyName))
  res.json(data)
}

/**
 * PUT /v2/teams/{teamId}/policies/{policyName}
 * Edit a policy (APL format)
 */
export const editAplPolicy = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, policyName } = req.params
  debug(`editPolicy(${policyName})`)
  const data = await req.otomi.editAplPolicy(
    decodeURIComponent(teamId),
    decodeURIComponent(policyName),
    req.body as AplPolicyRequest,
  )
  res.json(data)
}

/**
 * PATCH /v2/teams/{teamId}/policies/{policyName}
 * Partially update a policy (APL format)
 */
export const patchAplPolicy = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, policyName } = req.params
  debug(`editPolicy(${policyName}, patch)`)
  const data = await req.otomi.editAplPolicy(
    decodeURIComponent(teamId),
    decodeURIComponent(policyName),
    req.body as DeepPartial<AplPolicyRequest>,
    true,
  )
  res.json(data)
}
