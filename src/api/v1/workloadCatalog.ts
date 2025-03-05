import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:workloadCatalog')

export default function (): OperationHandlerArray {
  const post: Operation = [
    async ({ otomi, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`workloadCatalog(${body.name})`)
      const data = await otomi.getWorkloadCatalog(body)
      res.json(data)
    },
  ]
  const api = {
    post,
  }
  return api
}
