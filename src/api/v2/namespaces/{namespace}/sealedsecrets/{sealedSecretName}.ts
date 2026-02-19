import Debug from 'debug'
import { Response } from 'express'
import { DeepPartial, OpenApiRequestExt, SealedSecretManifestRequest } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:sealedsecrets')

/**
 * GET /v2/namespaces/{namespace}/sealedsecrets/{sealedSecretName}
 * Get a specific sealed secret for namespace (SealedSecret manifest format)
 */
export const getAplNamespaceSealedSecret = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { namespace, sealedSecretName } = req.params
  debug(`getSealedSecret(${sealedSecretName}) for namespace(${namespace})`)
  const data = await req.otomi.getAplNamespaceSealedSecret(
    decodeURIComponent(namespace),
    decodeURIComponent(sealedSecretName),
  )
  res.json(data)
}

/**
 * PUT /v2/namespaces/{namespace}/sealedsecrets/{sealedSecretName}
 * Edit a sealed secret for namespace (SealedSecret manifest format)
 */
export const editAplNamespaceSealedSecret = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { namespace, sealedSecretName } = req.params
  debug(`editSealedSecret(${sealedSecretName}) for namespace(${namespace})`)
  const data = await req.otomi.editAplNamespaceSealedSecret(
    decodeURIComponent(namespace),
    decodeURIComponent(sealedSecretName),
    req.body as SealedSecretManifestRequest,
  )
  res.json(data)
}

/**
 * PATCH /v2/namespaces/{namespace}/sealedsecrets/{sealedSecretName}
 * Partially update a sealed secret for namespace (SealedSecret manifest format)
 */
export const patchAplNamespaceSealedSecret = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { namespace, sealedSecretName } = req.params
  debug(`editSealedSecret(${sealedSecretName} for namespace(${namespace}), patch)`)
  const data = await req.otomi.editAplNamespaceSealedSecret(
    decodeURIComponent(namespace),
    decodeURIComponent(sealedSecretName),
    req.body as DeepPartial<SealedSecretManifestRequest>,
    true,
  )
  res.json(data)
}

/**
 * DELETE /v2/namespaces/{namespace}/sealedsecrets/{sealedSecretName}
 * Delete a sealed secret for namespace
 */
export const deleteAplNamespaceSealedSecret = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { namespace, sealedSecretName } = req.params
  debug(`deleteSealedSecret(${sealedSecretName}) for namespace(${namespace})`)
  await req.otomi.deleteAplNamespaceSealedSecret(decodeURIComponent(namespace), decodeURIComponent(sealedSecretName))
  res.json({})
}
