import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:cloudtty')

export default function (): OperationHandlerArray {
  const post: Operation = [
    async ({ otomi, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`connectCloudtty`)
      const v = await otomi.connectCloudtty(body)
      res.json(v)
    },
  ]
  const del: Operation = [
    ({ otomi, body }: OpenApiRequestExt, res) => {
      debug(`deleteCloudtty`)
      otomi.deleteCloudtty(body)
      res.json({})
    },
  ]
  const api = {
    post,
    delete: del,
  }
  return api
}
