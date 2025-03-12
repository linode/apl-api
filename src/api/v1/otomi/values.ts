import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:otomiValues')

export default function (): OperationHandlerArray {
  const get: Operation = [
    /* business middleware not expressible by OpenAPI documentation goes here */
    async ({ otomi, query }: OpenApiRequestExt, res): Promise<void> => {
      debug('getValues', query)
      const data = await otomi.getValues(query)
      const dateTime = new Date().toISOString()
      let fileName = `values-${dateTime}.yaml`
      if (query?.excludeSecrets === 'true') fileName = `values-redacted-${dateTime}.yaml`
      res.setHeader('Content-type', 'application/yaml')
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`)
      res.send(data)
    },
  ]
  const api = {
    get,
  }
  return api
}
