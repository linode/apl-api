import Debug from 'debug'
import { Response } from 'express'
import { AplSecretRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:sealedsecrets')

/**
 * GET /v2/teams/{teamId}/sealedsecrets
 * Get all sealed secrets for a team (APL format)
 */
export const getAplSealedSecrets = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.params
  debug(`getSealedSecrets(${teamId})`)
  const v = req.otomi.getAplSealedSecrets(decodeURIComponent(teamId))
  res.json(v)
}

/**
 * POST /v2/teams/{teamId}/sealedsecrets
 * Create a new sealed secret (APL format)
 */
export const createAplSealedSecret = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`createSealedSecret(${teamId}, ...)`)
  const v = await req.otomi.createAplSealedSecret(decodeURIComponent(teamId), req.body as AplSecretRequest)
  res.json(v)
}
