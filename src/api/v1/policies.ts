import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:policies')

/**
 * GET /v1/policies
 * Get all policies across all teams
 */
export const getAllPolicies = (req: OpenApiRequestExt, res: Response): void => {
  debug('getAllPolicies')
  const v = req.otomi.getAllPolicies()
  res.json(v)
}
