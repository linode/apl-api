import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { AplKnowledgeBaseRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:alpha:teams:kb')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { teamId, knowledgeBaseName } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteAplKnowledgeBase(${knowledgeBaseName})`)
      await otomi.deleteAplKnowledgeBase(decodeURIComponent(teamId), decodeURIComponent(knowledgeBaseName))
      res.json({})
    },
  ]
  const get: Operation = [
    async ({ otomi, params: { teamId, knowledgeBaseName } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`getAplKnowledgeBase(${knowledgeBaseName})`)
      const data = await otomi.getAplKnowledgeBase(decodeURIComponent(teamId), decodeURIComponent(knowledgeBaseName))
      res.json(data)
    },
  ]
  const put: Operation = [
    async ({ otomi, params: { teamId, knowledgeBaseName }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`editAplKnowledgeBase(${knowledgeBaseName})`)
      const data = await otomi.editAplKnowledgeBase(
        decodeURIComponent(teamId),
        decodeURIComponent(knowledgeBaseName),
        body as AplKnowledgeBaseRequest,
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
