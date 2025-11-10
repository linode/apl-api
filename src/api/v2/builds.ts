import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:builds')

/**
 * GET /v2/builds
 * Get all builds across all teams (APL format)
 */
export const getAllAplBuilds = (req: OpenApiRequestExt, res: Response): void => {
  debug('getAllBuilds')
  const v = req.otomi.getAllAplBuilds()
  res.json(v)
}
