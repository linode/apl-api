import Debug from 'debug'
import { Response } from 'express'
import { Backup, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:backups')

/**
 * GET /v1/teams/{teamId}/backups
 * Get all backups for a team
 */
export const getTeamBackups = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.params
  debug(`getTeamBackups(${teamId})`)
  const v = req.otomi.getTeamBackups(teamId)
  res.json(v)
}

/**
 * POST /v1/teams/{teamId}/backups
 * Create a new backup
 */
export const createBackup = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`createBackup(${teamId}, ...)`)
  const v = await req.otomi.createBackup(teamId, req.body as Backup)
  res.json(v)
}
