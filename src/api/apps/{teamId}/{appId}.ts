import { Operation, OperationHandlerArray } from 'express-openapi'
import { App, OpenApiRequestExt } from 'src/otomi-models'

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId, appId } }: OpenApiRequestExt, res): void => {
      res.json(otomi.getTeamApp(teamId, appId))
    },
  ]
  const put: Operation = [
    async ({ otomi, body, params: { teamId, appId } }: OpenApiRequestExt, res): Promise<void> => {
      res.json(await otomi.editApp(teamId, appId, body as App))
    },
  ]
  const api = {
    get,
    put,
  }
  return api
}
