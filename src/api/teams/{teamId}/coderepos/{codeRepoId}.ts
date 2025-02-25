import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { CodeRepo, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:codeRepos')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { teamId, codeRepoId } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteCodeRepo(${codeRepoId})`)
      await otomi.deleteCodeRepo(decodeURIComponent(teamId), decodeURIComponent(codeRepoId))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { teamId, codeRepoId } }: OpenApiRequestExt, res): void => {
      debug(`getCodeRepo(${codeRepoId})`)
      const data = otomi.getCodeRepo(decodeURIComponent(teamId), decodeURIComponent(codeRepoId))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, codeRepoId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editCodeRepo(${codeRepoId})`)
      const data = await otomi.editCodeRepo(decodeURIComponent(teamId), decodeURIComponent(codeRepoId), {
        ...body,
      } as CodeRepo)
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
