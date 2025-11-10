import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt, SealedSecret } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:sealedsecrets')

/**
 * GET /v1/teams/{teamId}/sealedsecrets/{sealedSecretName}
 * Get a specific sealed secret
 */
export const getSealedSecret = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, sealedSecretName } = req.params
  debug(`getSealedSecret(${sealedSecretName})`)
  const data = await req.otomi.getSealedSecret(decodeURIComponent(teamId), decodeURIComponent(sealedSecretName))
  res.json(data)
}

/**
 * PUT /v1/teams/{teamId}/sealedsecrets/{sealedSecretName}
 * Edit a sealed secret
 */
export const editSealedSecret = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, sealedSecretName } = req.params
  debug(`editSealedSecret(${sealedSecretName})`)
  const data = await req.otomi.editSealedSecret(
    decodeURIComponent(teamId),
    decodeURIComponent(sealedSecretName),
    req.body as SealedSecret,
  )
  res.json(data)
}

/**
 * DELETE /v1/teams/{teamId}/sealedsecrets/{sealedSecretName}
 * Delete a sealed secret
 */
export const deleteSealedSecret = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, sealedSecretName } = req.params
  debug(`deleteSealedSecret(${sealedSecretName})`)
  await req.otomi.deleteSealedSecret(decodeURIComponent(teamId), decodeURIComponent(sealedSecretName))
  res.json({})
}
