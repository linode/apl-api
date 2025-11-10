import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:kubernetes:fetchPodsFromLabel')

/**
 * GET /v1/teams/{teamId}/kubernetes/fetchPodsFromLabel
 * Fetch pods by label selector
 */
export const fetchPodsFromLabel = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('fetchPodsFromLabel')
  try {
    const { labelSelector, namespace } = req.query as { labelSelector: string; namespace: string }
    const v = await req.otomi.listUniquePodNamesByLabel(labelSelector, namespace)
    res.json(v)
  } catch (e) {
    debug(e)
    res.json([])
  }
}
