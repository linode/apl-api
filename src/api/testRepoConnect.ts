import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:testRepoConnect')

export default function (): OperationHandlerArray {
  const get: Operation = [
    async ({ otomi, query }: OpenApiRequestExt, res): Promise<void> => {
      debug(`getTestRepoConnect`, query)
      res.json(await otomi.getTestRepoConnect(query?.url as string))
    },
  ]
  const api = {
    get,
  }
  return api
}
