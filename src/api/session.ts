import { Operation } from 'express-openapi'
import OtomiStack from '../otomi-stack'
import { OpenApiRequestExt } from '../otomi-models'
import { cleanEnv, CLUSTER_ID } from '../validators'

export const env = cleanEnv(
  process.env,
  {
    CLUSTER_ID,
  },
  { strict: process.env.NODE_NAME !== 'test' },
)

export default function (otomi: OtomiStack) {
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
