import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Backup } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:backups')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeamBackups(${teamId})`)
      const v = otomi.getTeamBackups(teamId)
      res.json(v)
    },
  ]
  const post: Operation = [
    ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): void => {
      debug(`createBackup(${teamId}, ...)`)
      const v = otomi.createBackup(teamId, body as Backup)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }

  return api
}
