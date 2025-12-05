import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt, Team } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams')

/**
 * GET /v1/teams/{teamId}
 * Get a specific team
 */
export const getTeam = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.params
  debug(`getTeam(${teamId})`)
  const data = req.otomi.getTeam(teamId)
  res.json(data)
}

/**
 * PUT /v1/teams/{teamId}
 * Edit a team
 */
export const editTeam = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`editTeam(${teamId})`)
  const data = await req.otomi.editTeam(teamId, req.body as Team)
  res.json(data)
}

/**
 * DELETE /v1/teams/{teamId}
 * Delete team
 */
export const deleteTeam = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`deleteTeam(${teamId})`)
  await req.otomi.deleteTeam(teamId)
  res.json({})
}
