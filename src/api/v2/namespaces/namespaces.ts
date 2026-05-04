import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:namespaces')

/**
 * GET /v2/namespaces
 * Return namespaces that contain at least one sealedsecret
 */
export const getNamespacesWithSealedSecrets = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('getNamespacesWithSealedSecrets()')
  const namespaces = req.otomi.getNamespacesWithSealedSecrets()
  res.json(namespaces)
}
