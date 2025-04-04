import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Project } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:projects')

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
      const data = otomi.getProject(decodeURIComponent(teamId), decodeURIComponent(projectName))
      res.json(data)
    },
  ]
  const put: Operation = [
    ({ otomi, params: { teamId, projectName }, body }: OpenApiRequestExt, res): void => {
      debug(`editProject(${projectName})`)
      const data = otomi.editProject(decodeURIComponent(teamId), decodeURIComponent(projectName), {
        ...body,
        teamId: decodeURIComponent(teamId),
      } as Project)
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
