import Debug from 'debug'
import { type Operation, type OperationHandlerArray } from 'express-openapi'
import { AplAgentRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:alpha:teams:agents')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { teamId, agentName } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteAplAgent(${agentName})`)
      await otomi.deleteAplAgent(decodeURIComponent(teamId), decodeURIComponent(agentName))
      res.json({})
    },
  ]
  const get: Operation = [
    async ({ otomi, params: { teamId, agentName } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`getAplAgent(${agentName})`)
      const data = await otomi.getAplAgent(decodeURIComponent(teamId), decodeURIComponent(agentName))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, agentName }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editAplAgent(${agentName})`)
      const data = await otomi.editAplAgent(
        decodeURIComponent(teamId),
        decodeURIComponent(agentName),
        body as AplAgentRequest,
      )
      res.json(data)
    },
  ]
  const api = {
    delete: del,
    get,
    put,
  }
  return api
}
