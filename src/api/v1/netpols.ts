import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:netpols')

/**
 * GET /v1/netpols
 * Get all network policies across all teams
 */
export const getAllNetpols = (req: OpenApiRequestExt, res: Response): void => {
  debug('getAllNetpols')
  const v = req.otomi.getAllNetpols()
  res.json(v)
}
