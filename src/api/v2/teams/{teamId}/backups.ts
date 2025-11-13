import Debug from 'debug'
import { Response } from 'express'
import { AplBackupRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:backups')

/**
 * GET /v2/teams/{teamId}/backups
 * Get all backups for a team (APL format)
 */
export const getTeamAplBackups = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId } = req.params
  debug(`getTeamBackups(${teamId})`)
  const v = req.otomi.getTeamAplBackups(decodeURIComponent(teamId))
  res.json(v)
}

/**
 * POST /v2/teams/{teamId}/backups
 * Create a new backup (APL format)
 */
export const createAplBackup = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`createBackup(${teamId}, ...)`)
  const v = await req.otomi.createAplBackup(decodeURIComponent(teamId), req.body as AplBackupRequest)
  res.json(v)
}
