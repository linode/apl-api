import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:testRepoConnect')

/**
 * GET /v2/testRepoConnectPlatform
 * Test repository connection as platform admin
 */
export const getTestRepoConnectPlatform = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('testRepoConnectPlatform', req.query)

  const { url, secret } = req.query as {
    url: string
    secret?: string
  }

  res.json(await req.otomi.getTestRepoConnect(url, 'admin', secret || ''))
}
