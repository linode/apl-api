import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt, SealedSecret } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:sealedsecrets')

/**
 * GET /v1/teams/{teamId}/sealedsecrets
 * Get all sealed secrets for a team
 */
export const getTeamSealedSecrets = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.params
  debug(`getSealedSecrets(${teamId})`)
  const v = req.otomi.getSealedSecrets(decodeURIComponent(teamId))
  res.json(v)
}

/**
 * POST /v1/teams/{teamId}/sealedsecrets
 * Create a new sealed secret
 */
export const createSealedSecret = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`createSealedSecret(${teamId}, ...)`)
  const v = await req.otomi.createSealedSecret(decodeURIComponent(teamId), req.body as SealedSecret)
  res.json(v)
}
