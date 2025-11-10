import Debug from 'debug'
import { Response } from 'express'
import { AplBuildRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:builds')

/**
 * GET /v2/teams/{teamId}/builds
 * Get all builds for a team (APL format)
 */
export const getTeamAplBuilds = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.params
  debug(`getTeamBuilds(${teamId})`)
  const v = req.otomi.getTeamAplBuilds(decodeURIComponent(teamId))
  res.json(v)
}

/**
 * POST /v2/teams/{teamId}/builds
 * Create a new build (APL format)
 */
export const createAplBuild = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`createBuild(${teamId}, ...)`)
  const v = await req.otomi.createAplBuild(decodeURIComponent(teamId), req.body as AplBuildRequest)
  res.json(v)
}
