import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:cloudtty')

export default function (): OperationHandlerArray {
  const post: Operation = [
    async ({ otomi, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`connectCloudtty`)
      try {
        const v = await otomi.connectCloudtty(body)
        setTimeout(() => {
          res.json(v)
        }, 5 * 1000)
      } catch (e) {
        debug(e)
        res.json({})
      }
    },
  ]
  const del: Operation = [
    async ({ otomi, body }: OpenApiRequestExt, res) => {
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
