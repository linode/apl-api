import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:workloads')

/**
 * GET /v2/workloads
 * Get all workloads across all teams (APL format)
 */
export const getAllAplWorkloads = (req: OpenApiRequestExt, res: Response): void => {
  debug('getAllWorkloads')
  const v = req.otomi.getAllAplWorkloads()
  res.json(v)
}
