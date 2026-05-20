import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:internalRepoUrls')

/**
 * GET /v2/teams/{teamId}/internalRepoUrls
 * Get internal repository URLs for a team
 */
export const getInternalRepoUrls = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params

  debug(`getInternalRepoUrls ${teamId}`)

  const v = await req.otomi.getInternalRepoUrls(teamId)
  res.json(v)
}
