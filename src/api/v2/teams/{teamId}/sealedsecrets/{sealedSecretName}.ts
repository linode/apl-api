import Debug from 'debug'
import { Response } from 'express'
import { AplSecretRequest, DeepPartial, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:sealedsecrets')

/**
 * GET /v2/teams/{teamId}/sealedsecrets/{sealedSecretName}
 * Get a specific sealed secret (APL format)
 */
export const getAplSealedSecret = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, sealedSecretName } = req.params
  debug(`getSealedSecret(${sealedSecretName})`)
  const data = await req.otomi.getAplSealedSecret(decodeURIComponent(teamId), decodeURIComponent(sealedSecretName))
  res.json(data)
}

/**
 * PUT /v2/teams/{teamId}/sealedsecrets/{sealedSecretName}
 * Edit a sealed secret (APL format)
 */
export const editAplSealedSecret = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, sealedSecretName } = req.params
  debug(`editSealedSecret(${sealedSecretName})`)
  const data = await req.otomi.editAplSealedSecret(
    decodeURIComponent(teamId),
    decodeURIComponent(sealedSecretName),
    req.body as AplSecretRequest,
  )
  res.json(data)
}

/**
 * PATCH /v2/teams/{teamId}/sealedsecrets/{sealedSecretName}
 * Partially update a sealed secret (APL format)
 */
export const patchAplSealedSecret = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, sealedSecretName } = req.params
  debug(`editSealedSecret(${sealedSecretName}, patch)`)
  const data = await req.otomi.editAplSealedSecret(
    decodeURIComponent(teamId),
    decodeURIComponent(sealedSecretName),
    req.body as DeepPartial<AplSecretRequest>,
    true,
  )
  res.json(data)
}

/**
 * DELETE /v2/teams/{teamId}/sealedsecrets/{sealedSecretName}
 * Delete a sealed secret
 */
export const deleteAplSealedSecret = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, sealedSecretName } = req.params
  debug(`deleteSealedSecret(${sealedSecretName})`)
  await req.otomi.deleteSealedSecret(decodeURIComponent(teamId), decodeURIComponent(sealedSecretName))
  res.json({})
}
