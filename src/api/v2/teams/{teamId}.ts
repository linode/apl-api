import Debug from 'debug'
import { Response } from 'express'
import { ensureStatus } from 'src/api/response-utils'
import { AplTeamSettingsRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams')

/**
 * GET /v2/teams/{teamId}
 * Get a specific team
 */
export const getAplTeam = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.params
  debug(`getTeam(${teamId})`)
  const data = req.otomi.getAplTeam(teamId)
  res.json(ensureStatus(data))
}

/**
 * PUT /v2/teams/{teamId}
 * Edit a team
 */
export const editAplTeam = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`editTeam(${teamId})`)
  const data = await req.otomi.editAplTeam(teamId, req.body as AplTeamSettingsRequest)
  res.json(ensureStatus(data))
}

/**
 * PATCH /v2/teams/{teamId}
 * Partially update a team
 */
export const patchAplTeam = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`editTeam(${teamId}, patch)`)
  const data = await req.otomi.editAplTeam(teamId, req.body as AplTeamSettingsRequest, true)
  res.json(ensureStatus(data))
}

/**
 * DELETE /v2/teams/{teamId}
 * Delete team
 */
export const deleteAplTeam = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`deleteTeam(${teamId})`)
  await req.otomi.deleteAplTeam(teamId)
  res.status(200).end()
}
