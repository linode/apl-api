import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:dashboard')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, query: { teamName } }: OpenApiRequestExt, res): void => {
      debug(`getDashboard(${teamName})`)
      const v = otomi.getDashboard(teamName as string)
      res.json(v)
    },
  ]
  const api = {
    get,
  }

  return api
}
