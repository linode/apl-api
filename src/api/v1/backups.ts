import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:backups')

/**
 * GET /v1/backups
 * Get all backups across all teams
 */
export const getAllBackups = (req: OpenApiRequestExt, res: Response): void => {
  debug('getAllBackups')
  const v = req.otomi.getAllBackups()
  res.json(v)
}
