import { Operation } from 'express-openapi'

export default function (otomi) {
  const DELETE: Operation = [
    (req, res, next) => {
      console.debug(`Delete team: ${JSON.stringify(req.params)}`)
      otomi.deleteTeam(req.params.teamId)
      res.status(200).json({})
    },
  ]
  const GET: Operation = [
    (req, res, next) => {
      console.debug(`Get team: ${JSON.stringify(req.params)}`)
      const data = otomi.getTeam(req.params.teamId)
      res.status(200).json(data)
    },
  ]
  const PUT: Operation = [
    (req, res, next) => {
      console.debug(`Modify team: ${JSON.stringify(req.params)}`)
      const data = otomi.editTeam(req.params.teamId, req.body)
      res.status(200).json(data)
    },
  ]
  const api = {
    DELETE,
    GET,
    PUT,
  }
  return api
}
