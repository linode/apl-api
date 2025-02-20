import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { Build, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:builds')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { teamId, buildId } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteBuild(${buildId})`)
      await otomi.deleteBuild(decodeURIComponent(teamId), decodeURIComponent(buildId))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { teamId, buildId } }: OpenApiRequestExt, res): void => {
      debug(`getBuild(${buildId})`)
      const data = otomi.getBuild(decodeURIComponent(teamId), decodeURIComponent(buildId))
      res.json(data)
    },
  ]
  const put: Operation = [
    ({ otomi, params: { teamId, buildId }, body }: OpenApiRequestExt, res): void => {
      debug(`editBuild(${buildId})`)
      const data = otomi.editBuild(decodeURIComponent(teamId), decodeURIComponent(buildId), {
        ...body,
      } as Build)
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
