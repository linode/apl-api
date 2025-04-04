import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:codeRepos')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi }: OpenApiRequestExt, res): void => {
      debug('getAllCodeRepos')
      const v = otomi.getAllAplCodeRepos()
      res.json(v)
    },
  ]
  const api = {
    get,
  }
  return api
}
