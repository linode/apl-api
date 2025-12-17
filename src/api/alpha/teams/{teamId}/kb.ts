import Debug from 'debug'
import { Response } from 'express'
import { AplKnowledgeBaseRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:alpha:teams:kb')

/**
 * GET /alpha/teams/{teamId}/kb
 * Get all knowledge bases for a team
 */
export const getAplKnowledgeBases = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`getAplKnowledgeBases(${teamId})`)
  const v = await req.otomi.getAplKnowledgeBases(decodeURIComponent(teamId))
  res.json(v)
}

/**
 * POST /alpha/teams/{teamId}/kb
 * Create a new knowledge base
 */
export const createAplKnowledgeBase = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`createAplKnowledgeBase(${teamId}, ...)`)
  const v = await req.otomi.createAplKnowledgeBase(decodeURIComponent(teamId), req.body as AplKnowledgeBaseRequest)
  res.json(v)
}
