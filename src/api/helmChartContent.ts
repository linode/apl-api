import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:helmChartContent')

export default function (): OperationHandlerArray {
  const get: Operation = [
    async ({ otomi, query }: OpenApiRequestExt, res): Promise<string[]> => {
      debug(`gethelmChartContent ${query?.url}`)
      const v = await otomi.getHelmChartContent(query?.url as string)
      res.json(v)
      return v
    },
  ]
  const api = {
    get,
  }
  return api
}
