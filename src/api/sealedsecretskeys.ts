import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { createReadStream } from 'fs-extra'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:sealedsecrets')

export default function (): OperationHandlerArray {
  const get: Operation = [
    async ({ otomi }: OpenApiRequestExt, res): Promise<void> => {
      debug(`getSealedSecretsKeys`)
      const output = await otomi.getSealedSecretsKeys()
      res.setHeader('Content-Type', 'application/zip')
      res.setHeader('Content-Disposition', `attachment; filename=${output.fileName}`)
      const fileStream = createReadStream(output.filePath)
      fileStream.pipe(res)
    },
  ]
  const api = {
    get,
  }
  return api
}
