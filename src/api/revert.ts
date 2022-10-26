import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:revert')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi }: OpenApiRequestExt, res): void => {
      debug(`triggerRevert`)
      try {
        otomi.triggerRevert()
        res.json({})
      } catch (err) {
        debug(`Error: ${JSON.stringify(err)}`)
        res.status(err.code || 500).json({ error: err.publicMessage ?? 'Internal Server Error' })
      }
    },
  ]
  const api = {
    get,
  }
  return api
}
