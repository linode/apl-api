import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:workloadNameGenerator')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi }: OpenApiRequestExt, res): void => {
      debug('workloadNameGenerator')
      const v = otomi.getGeneratedWorkloadName()
      res.json(v)
    },
  ]
  const api = {
    get,
  }
  return api
}
