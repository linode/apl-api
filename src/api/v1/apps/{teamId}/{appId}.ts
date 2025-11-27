import { Response } from 'express'
import { App, OpenApiRequestExt } from 'src/otomi-models'

/**
 * GET /v1/apps/{teamId}/{appId}
 * Get a specific team app
 */
export const getTeamApp = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId, appId } = req.params
  res.json(req.otomi.getTeamApp(teamId, appId))
}

/**
 * PUT /v1/apps/{teamId}/{appId}
 * Edit a team app
 */
export const editTeamApp = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, appId } = req.params
  res.json(await req.otomi.editTeamApp(teamId, appId, req.body as App))
}
