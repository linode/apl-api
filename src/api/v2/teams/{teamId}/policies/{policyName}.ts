import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { AplPolicyRequest, DeepPartial, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:policies')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId, policyName } }: OpenApiRequestExt, res): void => {
      debug(`getPolicy(${policyName})`)
      const data = otomi.getAplPolicy(decodeURIComponent(teamId), decodeURIComponent(policyName))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, policyName }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editPolicy(${policyName})`)
      const data = await otomi.editAplPolicy(
        decodeURIComponent(teamId),
        decodeURIComponent(policyName),
        body as AplPolicyRequest,
      )
      res.json(data)
    },
  ]
  const patch: Operation = [
    async ({ otomi, params: { teamId, policyName }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editPolicy(${policyName}, patch)`)
      const data = await otomi.editAplPolicy(
        decodeURIComponent(teamId),
        decodeURIComponent(policyName),
        body as DeepPartial<AplPolicyRequest>,
        true,
      )
      res.json(data)
    },
  ]
  const api = {
    get,
    put,
    patch,
  }
  return api
}
