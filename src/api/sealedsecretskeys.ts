import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { createReadStream } from 'fs-extra'

const debug = Debug('otomi:api:sealedsecrets')

export default function (): OperationHandlerArray {
  const get: Operation = [
    (req, res): void => {
      debug(`getSealedSecretsKeys`)
      const mainkeyPath = '/tmp/sealed-secrets-main.key'
      res.setHeader('Content-Type', 'application/key')
      res.setHeader('Content-Disposition', `attachment; filename=sealed-secrets-main.key`)
      const fileStream = createReadStream(mainkeyPath)
      fileStream.pipe(res)
    },
  ]
  const api = {
    get,
  }
  return api
}
