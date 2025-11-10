import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:internalRepoUrls')

/**
 * GET /v1/internalRepoUrls
 * Get internal repository URLs
 */
export const getInternalRepoUrls = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug(`getInternalRepoUrls ${req.query?.teamId}`)
  const v = await req.otomi.getInternalRepoUrls(req.query?.teamId as string)
  res.json(v)
}
