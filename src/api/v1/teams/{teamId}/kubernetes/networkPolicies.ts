import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:kubernetes:networkPolicies')

/**
 * GET /v1/teams/{teamId}/kubernetes/networkPolicies
 * Get K8s pod labels for a workload
 */
export const getK8sPodLabelsForWorkload = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('getAllK8sPodLabelsForWorkload')
  try {
    const { workloadName, namespace } = req.query as { workloadName: string; namespace: string }
    const v = await req.otomi.getK8sPodLabelsForWorkload(workloadName, namespace)
    res.json(v)
  } catch (e) {
    debug(e)
    res.json([])
  }
}
