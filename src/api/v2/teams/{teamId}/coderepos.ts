import Debug from 'debug'
import { Response } from 'express'
import { AplCodeRepoRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:codeRepos')

/**
 * GET /v2/teams/{teamId}/coderepos
 * Get all code repositories for a team (APL format)
 */
export const getTeamAplCodeRepos = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.params
  debug(`getTeamCodeRepos(${teamId})`)
  const v = req.otomi.getTeamAplCodeRepos(decodeURIComponent(teamId))
  res.json(v)
}

/**
 * POST /v2/teams/{teamId}/coderepos
 * Create a new code repository (APL format)
 */
export const createAplCodeRepo = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`createCodeRepos(${teamId}, ...)`)
  const v = await req.otomi.createAplCodeRepo(decodeURIComponent(teamId), req.body as AplCodeRepoRequest)
  res.json(v)
}
