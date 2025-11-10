import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:secrets')

/**
 * GET /v1/teams/{teamId}/k8sSecrets
 * Get Kubernetes secrets for a team
 */
export const getSecretsFromK8s = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug('getSecretsFromK8s')
  const v = await req.otomi.getSecretsFromK8s(teamId)
  res.json(v)
}
