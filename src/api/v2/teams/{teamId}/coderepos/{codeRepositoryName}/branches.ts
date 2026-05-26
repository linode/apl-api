import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:repoBranches')

/**
 * GET /v2/teams/{teamId}/coderepos/{codeRepositoryName}/branches
 * Get repository branches
 */
export const getRepoBranches = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('getRepoBranches', req.params)

  const { teamId, codeRepositoryName } = req.params as {
    teamId: string
    codeRepositoryName: string
  }

  const branches = await req.otomi.getRepoBranches(codeRepositoryName, teamId)

  res.json(branches)
}
