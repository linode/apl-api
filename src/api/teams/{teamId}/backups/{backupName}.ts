import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { Backup, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:backups')

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
      const data = otomi.getBackup(decodeURIComponent(teamId), decodeURIComponent(backupName))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, backupName }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editBackup(${backupName})`)
      const data = await otomi.editBackup(decodeURIComponent(teamId), decodeURIComponent(backupName), {
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
