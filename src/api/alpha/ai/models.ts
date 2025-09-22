import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:alpha:ai:models')

export default function (): OperationHandlerArray {
  const get: Operation = [
    /* business middleware not expressible by OpenAPI documentation goes here */
    async ({ otomi }: OpenApiRequestExt, res): Promise<void> => {
      debug('getAllAIModels')
      const v = await otomi.getAllAIModels()
      res.json(v)
    },
  ]
  const api = {
    get,
  }
  return api
}
