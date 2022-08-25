import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequest } from '../otomi-models'
import OtomiStack from '../otomi-stack'

const debug = Debug('otomi:api:settings')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const get: Operation = [
    ({ query: { ids } }: OpenApiRequest, res): void => {
      debug(`getSettings(${ids})`)
      res.json(otomi.getSettings(ids as string[] | undefined))
    },
  ]
  const api = {
    get,
  }
  return api
}
