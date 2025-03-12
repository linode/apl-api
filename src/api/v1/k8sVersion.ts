import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:k8sVersion')

export default function (): OperationHandlerArray {
  const get: Operation = [
    /* business middleware not expressible by OpenAPI documentation goes here */
    async ({ otomi }: OpenApiRequestExt, res): Promise<void> => {
      debug(`getK8sVersion`)
      const v = await otomi.getK8sVersion()
      res.json(v)
    },
  ]
  const api = {
    get,
  }
  return api
}
