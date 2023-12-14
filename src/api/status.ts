import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:status')

export default function (): OperationHandlerArray {
  const post: Operation = [
    ({ otomi, body }: OpenApiRequestExt, res): void => {
      debug(`status(${body.resource})`)
      const data = otomi.status(body)
      res.json(data)
    },
  ]
  const api = {
    post,
  }
  return api
}
