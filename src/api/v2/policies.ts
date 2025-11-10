import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:policies')

/**
 * GET /v2/policies
 * Get all policies across all teams (APL format)
 */
export const getAllAplPolicies = (req: OpenApiRequestExt, res: Response): void => {
  debug('getAllPolicies')
  const v = req.otomi.getAllAplPolicies()
  res.json(v)
}
