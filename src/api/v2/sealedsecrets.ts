import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:sealedsecrets')

/**
 * GET /v2/sealedsecrets
 * Get all sealed secrets across all teams (APL format)
 */
export const getAllAplSealedSecrets = (req: OpenApiRequestExt, res: Response): void => {
  debug('getAllSealedSecrets')
  const v = req.otomi.getAllAplSealedSecrets()
  res.json(v)
}
