import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { Coderepo, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:coderepos')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { teamId, coderepoId } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteCoderepo(${coderepoId})`)
      await otomi.deleteCoderepo(decodeURIComponent(teamId), decodeURIComponent(coderepoId))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { teamId, coderepoId } }: OpenApiRequestExt, res): void => {
      debug(`getCoderepo(${coderepoId})`)
      const data = otomi.getCoderepo(decodeURIComponent(teamId), decodeURIComponent(coderepoId))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, coderepoId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editCoderepo(${coderepoId})`)
      const data = await otomi.editCoderepo(decodeURIComponent(teamId), decodeURIComponent(coderepoId), {
        ...body,
      } as Coderepo)
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
