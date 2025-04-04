import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:cloudtty')

export default function (): OperationHandlerArray {
  const post: Operation = [
    async ({ otomi, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`connectCloudtty`)
      const v = await otomi.connectCloudtty(body)
      res.json(v)
    },
  ]
  const del: Operation = [
    async ({ otomi, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteCloudtty`)
      await otomi.deleteCloudtty(body)
      res.json({})
    },
  ]
  const api = {
    post,
    delete: del,
  }
  return api
}
