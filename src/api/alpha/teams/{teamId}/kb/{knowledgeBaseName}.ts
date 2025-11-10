import Debug from 'debug'
import { Response } from 'express'
import { AplKnowledgeBaseRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:alpha:teams:kb')

/**
 * GET /alpha/teams/{teamId}/kb/{knowledgeBaseName}
 * Get a specific knowledge base
 */
export const getAplKnowledgeBase = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, knowledgeBaseName } = req.params
  debug(`getAplKnowledgeBase(${knowledgeBaseName})`)
  const data = await req.otomi.getAplKnowledgeBase(decodeURIComponent(teamId), decodeURIComponent(knowledgeBaseName))
  res.json(data)
}

/**
 * PUT /alpha/teams/{teamId}/kb/{knowledgeBaseName}
 * Edit a knowledge base
 */
export const editAplKnowledgeBase = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, knowledgeBaseName } = req.params
  debug(`editAplKnowledgeBase(${knowledgeBaseName})`)
  const data = await req.otomi.editAplKnowledgeBase(
    decodeURIComponent(teamId),
    decodeURIComponent(knowledgeBaseName),
    req.body as AplKnowledgeBaseRequest,
  )
  res.json(data)
}

/**
 * DELETE /alpha/teams/{teamId}/kb/{knowledgeBaseName}
 * Delete a knowledge base
 */
export const deleteAplKnowledgeBase = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, knowledgeBaseName } = req.params
  debug(`deleteAplKnowledgeBase(${knowledgeBaseName})`)
  await req.otomi.deleteAplKnowledgeBase(decodeURIComponent(teamId), decodeURIComponent(knowledgeBaseName))
  res.json({})
}
