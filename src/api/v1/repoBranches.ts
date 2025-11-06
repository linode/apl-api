import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:repoBranches')

/**
 * GET /v1/repoBranches
 * Get repository branches
 */
export const getRepoBranches = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('getRepoBranches', req.query)
  const { codeRepoName, teamId } = req.query as { codeRepoName: string; teamId: string }
  res.json(await req.otomi.getRepoBranches(codeRepoName, teamId))
}
