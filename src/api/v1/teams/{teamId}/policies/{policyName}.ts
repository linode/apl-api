import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt, Policy } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:policies')

/**
 * GET /v1/teams/{teamId}/policies/{policyName}
 * Get a specific policy
 */
export const getPolicy = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId, policyName } = req.params
  debug(`getPolicy(${policyName})`)
  const data = req.otomi.getPolicy(decodeURIComponent(teamId), decodeURIComponent(policyName))
  res.json(data)
}

/**
 * PUT /v1/teams/{teamId}/policies/{policyName}
 * Edit a policy
 */
export const editPolicy = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, policyName } = req.params
  debug(`editPolicy(${policyName})`)
  const data = await req.otomi.editPolicy(decodeURIComponent(teamId), decodeURIComponent(policyName), req.body as Policy)
  res.json(data)
}
