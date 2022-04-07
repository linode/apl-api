import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../otomi-stack'

const debug = Debug('otomi:api:teams')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    (req, res): void => {
      debug('getTeams')
      const data = otomi.getTeams()
      res.json(data)
    },
  ]
  const POST: Operation = [
    ({ body }, res): void => {
      debug('createTeam')
      const data = otomi.createTeam(body)
      res.json(data)
    },
  ]
  const api = {
    GET,
    POST,
  }
  return api
}
