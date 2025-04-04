import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Policy } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:policies')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId, policyName } }: OpenApiRequestExt, res): void => {
      debug(`getPolicy(${policyName})`)
      const data = otomi.getPolicy(decodeURIComponent(teamId), decodeURIComponent(policyName))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, policyName }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editPolicy(${policyName})`)
      const data = await otomi.editPolicy(decodeURIComponent(teamId), decodeURIComponent(policyName), body as Policy)
      res.json(data)
    },
  ]
  const api = {
    get,
    put,
  }
  return api
}
