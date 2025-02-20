import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { Backup, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:backups')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { teamId, backupId } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteBackup(${backupId})`)
      await otomi.deleteBackup(decodeURIComponent(teamId), decodeURIComponent(backupId))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { teamId, backupId } }: OpenApiRequestExt, res): void => {
      debug(`getBackup(${backupId})`)
      const data = otomi.getBackup(decodeURIComponent(teamId), decodeURIComponent(backupId))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, backupId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editBackup(${backupId})`)
      const data = await otomi.editBackup(decodeURIComponent(teamId), decodeURIComponent(backupId), {
        ...body,
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
