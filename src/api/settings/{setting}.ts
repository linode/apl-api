import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequest } from '../../otomi-models'
import OtomiStack from '../../otomi-stack'

const debug = Debug('otomi:api:settings')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    ({ params: { setting } }: OpenApiRequest, res): void => {
      debug(`getSetting(${setting})`)
      res.json({ [setting]: otomi.getSetting(setting) })
    },
  ]
  const PUT: Operation = [
    ({ body }: OpenApiRequest, res): void => {
      const setting = Object.keys(body)[0]
      debug(`setSetting(${setting})`)
      res.json(otomi.setSetting(body))
    },
  ]
  const api = {
    GET,
    PUT,
  }
  return api
}
