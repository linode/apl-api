import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:workloadNames')

/**
 * GET /v2/workloadNames
 * Get all workload names
 */
export const getAllWorkloadNames = (req: OpenApiRequestExt, res: Response): void => {
  debug('getAllWorkloadNames')
  const v = req.otomi.getAllWorkloadNames()
  res.json(v)
}
