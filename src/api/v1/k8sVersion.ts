import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:k8sVersion')

/**
 * GET /v1/k8sVersion
 * Get Kubernetes version
 */
export const getK8sVersion = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('getK8sVersion')
  const v = await req.otomi.getK8sVersion()
  res.json(v)
}
