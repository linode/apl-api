import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:delete')

export default function (): OperationHandlerArray {
  const del: Operation = [
    ({ otomi }: OpenApiRequestExt, res) => {
      debug(`doLicenseRemove`)
      otomi.removeLicense()
      res.json({})
    },
  ]
  const api = {
    delete: del,
  }
  return api
}
