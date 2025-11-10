import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:testRepoConnect')

/**
 * GET /v1/testRepoConnect
 * Test repository connection
 */
export const testRepoConnect = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('getTestRepoConnect', req.query)
  const { url, teamId, secret } = req.query as { url: string; teamId: string; secret: string }
  res.json(await req.otomi.getTestRepoConnect(url, teamId, secret))
}
