import Debug from 'debug'
import { Response } from 'express'
import { Build, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:builds')

/**
 * GET /v1/teams/{teamId}/builds
 * Get all builds for a team
 */
export const getTeamBuilds = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.params
  debug(`getTeamBuilds(${teamId})`)
  const v = req.otomi.getTeamBuilds(teamId)
  res.json(v)
}

/**
 * POST /v1/teams/{teamId}/builds
 * Create a new build
 */
export const createBuild = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`createBuild(${teamId}, ...)`)
  const v = await req.otomi.createBuild(teamId, req.body as Build)
  res.json(v)
}
