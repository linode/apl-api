import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { Backup, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:backups')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { backupId } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteBackup(${backupId})`)
      await otomi.deleteBackup(decodeURIComponent(backupId))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { backupId } }: OpenApiRequestExt, res): void => {
      debug(`getBackup(${backupId})`)
      const data = otomi.getBackup(decodeURIComponent(backupId))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, backupId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editBackup(${backupId})`)
      const data = await otomi.editBackup(decodeURIComponent(backupId), {
        ...body,
        teamId: decodeURIComponent(teamId),
      } as Backup)
      res.json(data)
    },
  ]
  const api = {
    delete: del,
    get,
    put,
  }
  return api
}
