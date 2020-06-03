import { Operation } from 'express-openapi'
import OtomiStack from '../otomi-stack'

export default function (otomi: OtomiStack) {
  const GET: Operation = [
    (req, res) => {
      const data = otomi.getTeams()

      res.status(200).json(data)
    },
  ]
  const POST: Operation = [
    ({ body }, res) => {
      const data = otomi.createTeam(body)
      res.status(200).json(data)
    },
  ]
  const api = {
    GET,
    POST,
  }
  return api
}
