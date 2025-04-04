import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { AplServiceRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:services')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeamServices(${teamId})`)
      const v = otomi.getTeamAplServices(decodeURIComponent(teamId))
      res.json(v)
    },
  ]
  const post: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`createService(${teamId}, ...)`)
      const v = await otomi.createAplService(decodeURIComponent(teamId), body as AplServiceRequest)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }

  return api
}
