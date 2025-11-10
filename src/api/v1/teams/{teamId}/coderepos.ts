import Debug from 'debug'
import { Response } from 'express'
import { CodeRepo, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:codeRepos')

/**
 * GET /v1/teams/{teamId}/coderepos
 * Get all code repositories for a team
 */
export const getTeamCodeRepos = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.params
  debug(`getTeamCodeRepos(${teamId})`)
  const v = req.otomi.getTeamCodeRepos(teamId)
  res.json(v)
}

/**
 * POST /v1/teams/{teamId}/coderepos
 * Create a new code repository
 */
export const createCodeRepo = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`createCodeRepos(${teamId}, ...)`)
  const v = await req.otomi.createCodeRepo(teamId, req.body as CodeRepo)
  res.json(v)
}
