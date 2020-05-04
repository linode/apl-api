import { Operation } from 'express-openapi'

export const parameters = []

export default function (otomi) {
  const GET: Operation = [
    (req, res, next) => {
      res.status(200).json({})
    },
  ]
  const api = {
    GET,
  }
  return api
}
