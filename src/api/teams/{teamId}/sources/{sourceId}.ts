import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt, Source } from 'src/otomi-models'

const debug = Debug('otomi:api:teams:sources')

export default function (): OperationHandlerArray {
  const del: Operation = [
    ({ otomi, params: { sourceId } }: OpenApiRequestExt, res): void => {
      debug(`deleteSource(${sourceId})`)
      otomi.deleteSource(decodeURIComponent(sourceId))
      res.json({})
    },
  ]
  const get: Operation = [
    ({ otomi, params: { sourceId } }: OpenApiRequestExt, res): void => {
      debug(`getSource(${sourceId})`)
      const data = otomi.getSource(decodeURIComponent(sourceId))
      res.json(data)
    },
  ]
  const put: Operation = [
    ({ otomi, params: { teamId, sourceId }, body }: OpenApiRequestExt, res): void => {
      debug(`editSource(${sourceId})`)
      const data = otomi.editSource(decodeURIComponent(sourceId), {
        ...body,
        teamId: decodeURIComponent(teamId),
      } as Source)
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
