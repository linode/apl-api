import Debug from 'debug'
import { Response } from 'express'
import { Backup, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:backups')

/**
 * GET /v1/teams/{teamId}/backups/{backupName}
 * Get a specific backup
 */
export const getBackup = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId, backupName } = req.params
  debug(`getBackup(${backupName})`)
  const data = req.otomi.getBackup(decodeURIComponent(teamId), decodeURIComponent(backupName))
  res.json(data)
}

/**
 * PUT /v1/teams/{teamId}/backups/{backupName}
 * Edit a backup
 */
export const editBackup = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, backupName } = req.params
  debug(`editBackup(${backupName})`)
  const data = await req.otomi.editBackup(decodeURIComponent(teamId), decodeURIComponent(backupName), {
    ...req.body,
  } as Backup)
  res.json(data)
}

/**
 * DELETE /v1/teams/{teamId}/backups/{backupName}
 * Delete a backup
 */
export const deleteBackup = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, backupName } = req.params
  debug(`deleteBackup(${backupName})`)
  await req.otomi.deleteBackup(decodeURIComponent(teamId), decodeURIComponent(backupName))
  res.json({})
}
