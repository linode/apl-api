import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { AplWorkloadRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:workloads')

export default function (): OperationHandlerArray {
  const get: Operation = [
    ({ otomi, params: { teamId } }: OpenApiRequestExt, res): void => {
      debug(`getTeamWorkloads(${teamId})`)
      const v = otomi.getTeamAplWorkloads(decodeURIComponent(teamId))
      res.json(v)
    },
  ]
  const post: Operation = [
    async ({ otomi, params: { teamId }, body }: OpenApiRequestExt, res): Promise<void> => {
      debug(`createWorkload(${teamId}, ...)`)
      const v = await otomi.createAplWorkload(decodeURIComponent(teamId), body as AplWorkloadRequest)
      res.json(v)
    },
  ]
  const api = {
    get,
    post,
  }

  return api
}
