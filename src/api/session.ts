import { Operation } from 'express-openapi'
import OtomiStack from '../otomi-stack'
import { OpenApiRequestExt } from '../otomi-models'
import { getEnv } from '../utils'

export default function (otomi: OtomiStack) {
  const env = getEnv()

  const GET: Operation = [
    (req: OpenApiRequestExt, res) => {
      const data = {
        currentClusterId: env.CLUSTER_ID,
        clusters: otomi.getClusters(),
        core: otomi.getCore(),
        user: req.user,
        teams: otomi.getTeams(),
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
