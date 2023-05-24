import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { LicenseJwt, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:activate')

export default function (): OperationHandlerArray {
  const put: Operation = [
    async ({ otomi, body }: OpenApiRequestExt, res): Promise<void> => {
      debug('Update license')
      const data = await otomi.uploadLicense((body as LicenseJwt).jwt)
      res.json(data)
    },
  ]

  const api = {
    put,
  }
  return api
}
