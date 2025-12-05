import Debug from 'debug'
import { Response } from 'express'
import { AplAgentRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:alpha:teams:agents')

/**
 * GET /alpha/teams/{teamId}/agents/{agentName}
 * Get a specific agent
 */
export const getAplAgent = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, agentName } = req.params
  debug(`getAplAgent(${agentName})`)
  const data = await req.otomi.getAplAgent(decodeURIComponent(teamId), decodeURIComponent(agentName))
  res.json(data)
}

/**
 * PUT /alpha/teams/{teamId}/agents/{agentName}
 * Edit an agent
 */
export const editAplAgent = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, agentName } = req.params
  debug(`editAplAgent(${agentName})`)
  const data = await req.otomi.editAplAgent(
    decodeURIComponent(teamId),
    decodeURIComponent(agentName),
    req.body as AplAgentRequest,
  )
  res.json(data)
}

/**
 * DELETE /alpha/teams/{teamId}/agents/{agentName}
 * Delete an agent
 */
export const deleteAplAgent = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, agentName } = req.params
  debug(`deleteAplAgent(${agentName})`)
  await req.otomi.deleteAplAgent(decodeURIComponent(teamId), decodeURIComponent(agentName))
  res.json({})
}
