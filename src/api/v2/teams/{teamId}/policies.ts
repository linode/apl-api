import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:policies')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeamPolicies(${teamId})`)
      const v = otomi.getTeamAplPolicies(decodeURIComponent(teamId))
      res.json(v)
    },
  ]
  const api = {
    get,
  }

  return api
}
