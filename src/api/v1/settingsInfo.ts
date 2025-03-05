import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:settingsinfo')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi }: OpenApiRequestExt, res): void => {
      debug(`getSettingsInfo`)
      res.json(otomi.getSettingsInfo())
    },
  ]
  const api = {
    get,
  }
  return api
}
