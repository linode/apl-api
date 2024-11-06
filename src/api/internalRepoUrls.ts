import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:internalRepoUrls')

export default function (): OperationHandlerArray {
  const get: Operation = [
    async ({ otomi }: OpenApiRequestExt, res): Promise<string[]> => {
      debug('getInternalRepoUrls')
      const v = await otomi.getInternalRepoUrls()
      res.json(v)
      return v
    },
  ]
  const api = {
    get,
  }
  return api
}
