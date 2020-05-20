import { Operation } from 'express-openapi'

export default function () {
  const GET: Operation = [
    (req, res) => {
      res.status(200).json({})
    },
  ]
  const api = {
    GET,
  }
  return api
}
