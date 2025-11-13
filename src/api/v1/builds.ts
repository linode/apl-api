import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:builds')

/**
 * GET /v1/builds
 * Get all builds across all teams
 */
export const getAllBuilds = (req: OpenApiRequestExt, res: Response): void => {
  debug('getAllBuilds')
  const v = req.otomi.getAllBuilds()
  res.json(v)
}
