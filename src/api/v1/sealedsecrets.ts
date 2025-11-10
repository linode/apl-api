import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:sealedsecrets')

/**
 * GET /v1/sealedsecrets
 * Get all sealed secrets across all teams
 */
export const getAllSealedSecrets = (req: OpenApiRequestExt, res: Response): void => {
  debug('getAllSealedSecrets')
  const v = req.otomi.getAllSealedSecrets()
  res.json(v)
}
