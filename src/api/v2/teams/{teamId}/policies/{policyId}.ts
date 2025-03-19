import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { AplPolicyRequest, DeepPartial, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:policies')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId, policyId } }: OpenApiRequestExt, res): void => {
      debug(`getPolicy(${policyId})`)
      const data = otomi.getAplPolicy(decodeURIComponent(teamId), decodeURIComponent(policyId))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, policyId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editPolicy(${policyId})`)
      const data = await otomi.editAplPolicy(
        decodeURIComponent(teamId),
        decodeURIComponent(policyId),
        body as AplPolicyRequest,
      )
      res.json(data)
    },
  ]
  const patch: Operation = [
    async ({ otomi, params: { teamId, policyId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editPolicy(${policyId}, patch)`)
      const data = await otomi.editAplPolicy(
        decodeURIComponent(teamId),
        decodeURIComponent(policyId),
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
