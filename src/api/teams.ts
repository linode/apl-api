import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../otomi-stack'

const debug = Debug('otomi:api:teams')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const get: Operation = [
    (req, res): void => {
      debug('getTeams')
      // we filter admin team here as it is not for console
      const data = (otomi.getTeams() || []).filter((t) => t.id !== 'admin')
      res.json(data)
    },
  ]
  const post: Operation = [
    ({ body }, res): void => {
      debug('createTeam')
      const data = otomi.createTeam(body)
      res.json(data)
    },
  ]
  const api = {
    get,
    post,
  }
  return api
}
