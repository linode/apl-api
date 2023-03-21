import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:activate')

export default function (): OperationHandlerArray {
  const put: Operation = [
    ({ otomi, body }: OpenApiRequestExt, res): void => {
      debug('Update license')
      const data = otomi.uploadLicense(body as string)
      res.json(data)
    },
  ]

  const api = {
    put,
  }
  return api
}
