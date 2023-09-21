import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:customWorkloadValues')

export default function (): OperationHandlerArray {
  const post: Operation = [
    async ({ otomi, body }: OpenApiRequestExt, res): Promise<void> => {
      // const { image, containerPorts, fullnameOverride, ...rest } = body.values
      debug(`customWorkloadValues(${body.name})`)
      const data = await otomi.getCustomWorkloadValues(body)
      res.json(data)
    },
  ]
  const api = {
    post,
  }
  return api
}
