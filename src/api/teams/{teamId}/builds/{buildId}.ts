import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Build } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:builds')

export default function (): OperationHandlerArray {
  const del: Operation = [
    ({ otomi, params: { buildId } }: OpenApiRequestExt, res): void => {
      debug(`deleteBuild(${buildId})`)
      otomi.deleteBuild(decodeURIComponent(buildId))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { buildId } }: OpenApiRequestExt, res): void => {
      debug(`getBuild(${buildId})`)
      const data = otomi.getBuild(decodeURIComponent(buildId))
      res.json(data)
    },
  ]
  const put: Operation = [
    ({ otomi, params: { teamId, buildId }, body }: OpenApiRequestExt, res): void => {
      debug(`editBuild(${buildId})`)
      const data = otomi.editBuild(decodeURIComponent(buildId), {
        ...body,
        teamId: decodeURIComponent(teamId),
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
