import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:kubernetes:fetchPodsFromLabel')

export default function (): OperationHandlerArray {
  const get: Operation = [
    async ({ otomi, query, params }: OpenApiRequestExt, res): Promise<void> => {
      console.log('req.params', query)
      debug('fetchPodsFromLabel')
      try {
        const { labelSelector, namespace }: { labelSelector: string; namespace: string } = query as any
        const v = await otomi.listUniquePodNamesByLabel(labelSelector, namespace)
        res.json(v)
      } catch (e) {
        debug(e)
        res.json([])
      }
    },
  ]
  const api = {
    get,
  }
  return api
}
