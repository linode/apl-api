import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:testRepoConnect')

/**
 * GET /v2/teams/{teamId}/coderepos/testRepoConnect
 * Test repository connection
 */
export const getTestRepoConnect = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('getTestRepoConnect', { params: req.params, query: req.query })

  const { teamId } = req.params as { teamId: string }
  const { url, secretName } = req.query as { url: string; secretName?: string }

  const result = await req.otomi.getTestRepoConnect(url, teamId, secretName || '')

  res.json(result)
}
