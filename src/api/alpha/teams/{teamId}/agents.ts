import Debug from 'debug'
import { Response } from 'express'
import { AplAgentRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:alpha:teams:agents')

/**
 * GET /alpha/teams/{teamId}/agents
 * Get all agents for a team
 */
export const getAplAgents = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`getAplAgents(${teamId})`)
  const v = await req.otomi.getAplAgents(decodeURIComponent(teamId))
  res.json(v)
}

/**
 * POST /alpha/teams/{teamId}/agents
 * Create a new agent
 */
export const createAplAgent = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`createAplAgent(${teamId}, ...)`)
  const v = await req.otomi.createAplAgent(decodeURIComponent(teamId), req.body as AplAgentRequest)
  res.json(v)
}
