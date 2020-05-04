import { Operation } from 'express-openapi'

const env = process.env

export default function (otomi) {
  const fallbackCluster = env.NODE_ENV !== 'production' ? 'google/dev' : ''

  const GET: Operation = [
    (req, res, next) => {
      const teamId = req.header('Auth-Group')
      const email = req.header('Auth-User')
      const isAdmin = teamId === 'admin'
      const role = teamId === 'admin' ? 'admin' : 'team'
      const data = {
        currentClusterId: env.CLUSTER ? env.CLUSTER : fallbackCluster,
        clusters: otomi.getClusters(),
        core: otomi.getCore(),
        user: { email, teamId, isAdmin, role },
        isDirty: otomi.db.isDirty(),
      }
      res.status(200).json(data)
    },
  ]
  const api = {
    GET,
  }
  return api
}
