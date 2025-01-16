import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Project } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:projects')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { projectId } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteProject(${projectId})`)
      await otomi.deleteProject(decodeURIComponent(projectId))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { projectId } }: OpenApiRequestExt, res): void => {
      debug(`getProject(${projectId})`)
      const data = otomi.getProject(decodeURIComponent(projectId))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, projectId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editProject(${projectId})`)
      const data = await otomi.editProject(decodeURIComponent(projectId), {
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
