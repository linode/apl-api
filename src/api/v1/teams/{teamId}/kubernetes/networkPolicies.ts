import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:kubernetes:networkPolicies')

export default function (): OperationHandlerArray {
  const get: Operation = [
    async ({ otomi, query }: OpenApiRequestExt, res): Promise<void> => {
      debug('getAllK8sPodLabelsForWorkload')
      try {
        const { workloadName, namespace }: { workloadName: string; namespace: string } = query as any
        const v = await otomi.getK8sPodLabelsForWorkload(workloadName, namespace)
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
