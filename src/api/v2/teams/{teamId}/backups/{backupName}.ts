import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { AplBackupRequest, DeepPartial, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:backups')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { teamId, backupName } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteBackup(${backupName})`)
      await otomi.deleteBackup(decodeURIComponent(teamId), decodeURIComponent(backupName))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { teamId, backupName } }: OpenApiRequestExt, res): void => {
      debug(`getBackup(${backupName})`)
      const data = otomi.getAplBackup(decodeURIComponent(teamId), decodeURIComponent(backupName))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, backupName }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editBackup(${backupName})`)
      const data = await otomi.editAplBackup(
        decodeURIComponent(teamId),
        decodeURIComponent(backupName),
        body as AplBackupRequest,
      )
      res.json(data)
    },
  ]
  const patch: Operation = [
    async ({ otomi, params: { teamId, backupName }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editBackup(${backupName}, patch)`)
      const data = await otomi.editAplBackup(
        decodeURIComponent(teamId),
        decodeURIComponent(backupName),
        body as DeepPartial<AplBackupRequest>,
        true,
      )
      res.json(data)
    },
  ]
  const api = {
    delete: del,
    get,
    put,
    patch,
  }
  return api
}
