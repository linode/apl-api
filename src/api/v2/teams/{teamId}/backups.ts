import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { AplBackupRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:backups')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeamBackups(${teamId})`)
      const v = otomi.getTeamAplBackups(decodeURIComponent(teamId))
      res.json(v)
    },
  ]
  const post: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`createBackup(${teamId}, ...)`)
      const v = await otomi.createAplBackup(decodeURIComponent(teamId), body as AplBackupRequest)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }

  return api
}
