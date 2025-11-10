import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:backups')

/**
 * GET /v2/backups
 * Get all backups across all teams (APL format)
 */
export const getAllAplBackups = (req: OpenApiRequestExt, res: Response): void => {
  debug('getAllBackups')
  const v = req.otomi.getAllAplBackups()
  res.json(v)
}
