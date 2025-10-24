import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { AplKnowledgeBaseRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:alpha:teams:kb')

export default function (): OperationHandlerArray {
  const get: Operation = [
    async ({ otomi, params: { teamId } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`getAplKnowledgeBases(${teamId})`)
      const v = await otomi.getAplKnowledgeBases(decodeURIComponent(teamId))
      res.json(v)
    },
  ]
  const post: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`createAplKnowledgeBase(${teamId}, ...)`)
      const v = await otomi.createAplKnowledgeBase(decodeURIComponent(teamId), body as AplKnowledgeBaseRequest)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }
  return api
}
