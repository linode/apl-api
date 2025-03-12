import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:internalRepoUrls')

export default function (): OperationHandlerArray {
  const get: Operation = [
    async ({ otomi, query }: OpenApiRequestExt, res): Promise<string[]> => {
      debug(`getInternalRepoUrls ${query?.teamId}`)
      const v = await otomi.getInternalRepoUrls(query?.teamId as string)
      res.json(v)
      return v
    },
  ]
  const api = {
    get,
  }
  return api
}
