import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:projects')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { teamId, projectName } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteProject(${projectName})`)
      await otomi.deleteProject(decodeURIComponent(teamId), decodeURIComponent(projectName))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { teamId, projectName } }: OpenApiRequestExt, res): void => {
      debug(`getProject(${projectName})`)
      const data = otomi.getAplProject(decodeURIComponent(teamId), decodeURIComponent(projectName))
      res.json(data)
    },
  ]
  const api = {
    delete: del,
    get,
  }
  return api
}
