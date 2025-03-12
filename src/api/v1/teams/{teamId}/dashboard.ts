import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:dashboard')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getDashboard(${teamId})`)
      const v = otomi.getDashboard(teamId)
      res.json(v)
    },
  ]
  const api = {
    get,
  }

  return api
}
