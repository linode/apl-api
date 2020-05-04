import { Operation } from 'express-openapi'

export default function (otomi) {
  const GET: Operation = [
    (req, res, next) => {
      const data = otomi.getTeams()

      res.status(200).json(data)
    },
  ]
  const POST: Operation = [
    (req, res, next) => {
      const data = otomi.createTeam(null, req.body)
      res.status(200).json(data)
    },
  ]
  const api = {
    GET,
    POST,
  }
  return api
}
