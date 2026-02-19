import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt, SealedSecretManifestRequest } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:namespaces:sealedsecrets')

/**
 * GET /v2/namespaces/{namespace}/sealedsecrets
 * get all sealed secrets for namespace (SealedSecret manifest format)
 */
export const getAplNamespaceSealedSecrets = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { namespace } = req.params
  debug(`gertAplNamespaceSealedSecrets(${namespace}, ...)`)
  const v = await req.otomi.getAllAplNamespaceSealedSecrets()
  res.json(v)
}

/**
 * POST /v2/namespaces/{namespace}/sealedsecrets
 * Create a new sealed secret (SealedSecret manifest format)
 */
export const createAplNamespaceSealedSecret = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { namespace } = req.params
  debug(`createNamespaceSealedSecret(${namespace}, ...)`)
  const v = await req.otomi.createAplNamespaceSealedSecret(
    decodeURIComponent(namespace),
    req.body as SealedSecretManifestRequest,
  )
  res.json(v)
}
