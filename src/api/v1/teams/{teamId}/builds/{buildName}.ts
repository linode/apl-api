import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { Build, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:builds')

export default function (): OperationHandlerArray {
  const del: Operation = [
    async ({ otomi, params: { teamId, buildName } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`deleteBuild(${buildName})`)
      await otomi.deleteBuild(decodeURIComponent(teamId), decodeURIComponent(buildName))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { teamId, buildName } }: OpenApiRequestExt, res): void => {
      debug(`getBuild(${buildName})`)
      const data = otomi.getBuild(decodeURIComponent(teamId), decodeURIComponent(buildName))
      res.json(data)
    },
  ]
  const put: Operation = [
    ({ otomi, params: { teamId, buildName }, body }: OpenApiRequestExt, res): void => {
      debug(`editBuild(${buildName})`)
      const data = otomi.editBuild(decodeURIComponent(teamId), decodeURIComponent(buildName), {
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
