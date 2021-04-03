import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../otomi-stack'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    (req, res): void => {
      const data = otomi.getTeams()
      res.json(data)
    },
  ]
  const POST: Operation = [
    ({ body }, res): void => {
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
