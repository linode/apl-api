import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:workloads')

/**
 * GET /v1/workloads
 * Get all workloads across all teams
 */
export const getAllWorkloads = (req: OpenApiRequestExt, res: Response): void => {
  debug('getAllWorkloads')
  const v = req.otomi.getAllWorkloads()
  res.json(v)
}
