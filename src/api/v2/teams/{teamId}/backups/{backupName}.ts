import Debug from 'debug'
import { Response } from 'express'
import { AplBackupRequest, DeepPartial, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:backups')

/**
 * GET /v2/teams/{teamId}/backups/{backupName}
 * Get a specific backup (APL format)
 */
export const getAplBackup = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId, backupName } = req.params
  debug(`getBackup(${backupName})`)
  const data = req.otomi.getAplBackup(decodeURIComponent(teamId), decodeURIComponent(backupName))
  res.json(data)
}

/**
 * PUT /v2/teams/{teamId}/backups/{backupName}
 * Edit a backup (APL format)
 */
export const editAplBackup = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, backupName } = req.params
  debug(`editBackup(${backupName})`)
  const data = await req.otomi.editAplBackup(
    decodeURIComponent(teamId),
    decodeURIComponent(backupName),
    req.body as AplBackupRequest,
  )
  res.json(data)
}

/**
 * PATCH /v2/teams/{teamId}/backups/{backupName}
 * Partially update a backup (APL format)
 */
export const patchAplBackup = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, backupName } = req.params
  debug(`editBackup(${backupName}, patch)`)
  const data = await req.otomi.editAplBackup(
    decodeURIComponent(teamId),
    decodeURIComponent(backupName),
    req.body as DeepPartial<AplBackupRequest>,
    true,
  )
  res.json(data)
}

/**
 * DELETE /v2/teams/{teamId}/backups/{backupName}
 * Delete a backup
 */
export const deleteAplBackup = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, backupName } = req.params
  debug(`deleteBackup(${backupName})`)
  await req.otomi.deleteBackup(decodeURIComponent(teamId), decodeURIComponent(backupName))
  res.json({})
}
