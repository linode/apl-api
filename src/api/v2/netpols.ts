import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:netpols')

/**
 * GET /v2/netpols
 * Get all network policies across all teams (APL format)
 */
export const getAllAplNetpols = (req: OpenApiRequestExt, res: Response): void => {
  debug('getAllNetpols')
  const v = req.otomi.getAllAplNetpols()
  res.json(v)
}
