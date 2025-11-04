import Debug from 'debug'
import { type Operation, type OperationHandlerArray } from 'express-openapi'
import { AplAgentRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:alpha:teams:agents')

export default function (): OperationHandlerArray {
  const get: Operation = [
    async ({ otomi, params: { teamId } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`getAplAgents(${teamId})`)
      const v = await otomi.getAplAgents(decodeURIComponent(teamId))
      res.json(v)
    },
  ]

  const post: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`createAplAgent(${teamId}, ...)`)
      const v = await otomi.createAplAgent(decodeURIComponent(teamId), body as AplAgentRequest)
      res.json(v)
    },
  ]

  const api = {
    get,
    post,
  }
  return api
}
