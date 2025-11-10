import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:services')

/**
 * GET /v2/services
 * Get all services running on the cluster (APL format)
 */
export const getAllAplServices = (req: OpenApiRequestExt, res: Response): void => {
  debug('getAllServices')
  const v = req.otomi.getAllAplServices()
  res.json(v)
}
