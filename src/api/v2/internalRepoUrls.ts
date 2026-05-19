import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:internalRepoUrls')

/**
 * GET /v2/internalRepoUrls
 * Get internal repository URLs
 */
export const getInternalRepoUrls = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug(`getInternalRepoUrls ${req.query?.teamId}`)
  const v = await req.otomi.getInternalRepoUrls(req.query?.teamId as string)
  res.json(v)
}
