import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:repoBranches')

export default function (): OperationHandlerArray {
  const get: Operation = [
    async ({ otomi, query }: OpenApiRequestExt, res): Promise<void> => {
      debug(`getRepoBranches`, query)
      const { codeRepoName, teamId }: { codeRepoName: string; teamId: string } = query as any
      res.json(await otomi.getRepoBranches(codeRepoName, teamId))
    },
  ]
  const api = {
    get,
  }
  return api
}
