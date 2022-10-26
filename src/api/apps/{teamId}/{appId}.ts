import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId, appId } }: OpenApiRequestExt, res): void => {
      res.json(otomi.getApp(teamId, appId))
    },
  ]
  const put: Operation = [
    ({ otomi, body, params: { teamId, appId } }: OpenApiRequestExt, res): void => {
      res.json(otomi.editApp(teamId, appId, body))
    },
  ]
  const api = {
    get,
    put,
  }
  return api
}
