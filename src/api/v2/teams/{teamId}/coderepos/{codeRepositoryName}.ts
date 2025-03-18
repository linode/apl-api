import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { AplCodeRepoRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:codeRepos')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { teamId, codeRepositoryName } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteCodeRepo(${codeRepositoryName})`)
      await otomi.deleteCodeRepo(decodeURIComponent(teamId), decodeURIComponent(codeRepositoryName))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { teamId, codeRepositoryName } }: OpenApiRequestExt, res): void => {
      debug(`getCodeRepo(${codeRepositoryName})`)
      const data = otomi.getAplCodeRepo(decodeURIComponent(teamId), decodeURIComponent(codeRepositoryName))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, codeRepositoryName }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editCodeRepo(${codeRepositoryName})`)
      const data = await otomi.editAplCodeRepo(
        decodeURIComponent(teamId),
        decodeURIComponent(codeRepositoryName),
        body as AplCodeRepoRequest,
      )
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
