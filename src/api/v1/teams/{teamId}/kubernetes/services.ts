import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:kubernetes:services')

/**
 * GET /v1/teams/{teamId}/kubernetes/services
 * Get all Kubernetes services for a team
 */
export const getK8sServices = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug('getAllK8sServices')
  try {
    const v = await req.otomi.getK8sServices(teamId)
    res.json(v)
  } catch (e) {
    debug(e)
    res.json([])
  }
}
