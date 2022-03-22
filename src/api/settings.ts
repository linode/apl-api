import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequest } from '../otomi-models'
import OtomiStack from '../otomi-stack'

const debug = Debug('otomi:api:settings')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    ({ query: { settingIds } }: OpenApiRequest, res): void => {
      debug(`getSettings(${settingIds})`)
      res.json(otomi.getSettings(settingIds as string[] | undefined))
    },
  ]
  const PUT: Operation = [
    ({ body }: OpenApiRequest, res): void => {
      const settingIds = Object.keys(body)
      debug(`editSettings(${settingIds.join(',')})`)
      res.json(otomi.editSettings(body))
    },
  ]
  const api = {
    GET,
    PUT,
  }
  return api
}
