import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:services')

/**
 * GET /v1/services
 * Get all services running on the cluster
 */
export const getAllServices = (req: OpenApiRequestExt, res: Response): void => {
  debug('getAllServices')
  const v = req.otomi.getAllServices()
  res.json(v)
}
