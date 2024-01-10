import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Policy } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:policies')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { policyId } }: OpenApiRequestExt, res): void => {
      debug(`getPolicy(${policyId})`)
      const data = otomi.getPolicy(decodeURIComponent(policyId))
      res.json(data)
    },
  ]
  const put: Operation = [
    ({ otomi, params: { teamId, policyId }, body }: OpenApiRequestExt, res): void => {
      debug(`editPolicy(${policyId})`)
      const data = otomi.editPolicy(decodeURIComponent(policyId), {
        ...body,
        teamId: decodeURIComponent(teamId),
      } as Policy)
      res.json(data)
    },
  ]
  const api = {
    get,
    put,
  }
  return api
}
