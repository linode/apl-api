import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:cloudtty')

export default function (): OperationHandlerArray {
  const get: Operation = [
    async ({ otomi, query, user: sessionUser }: OpenApiRequestExt, res): Promise<void> => {
      debug(`connectCloudtty - ${sessionUser.email} - ${sessionUser.sub}`)
      const { teamId }: { teamId: string } = query as { teamId: string }
      const v = await otomi.connectCloudtty(teamId, sessionUser)
      res.json(v)
    },
  ]
  const del: Operation = [
    async ({ otomi, user: sessionUser }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteCloudtty - ${sessionUser.email} - ${sessionUser.sub}`)
      await otomi.deleteCloudtty(sessionUser)
      res.json({})
    },
  ]
  const api = {
    get,
    delete: del,
  }
  return api
}
