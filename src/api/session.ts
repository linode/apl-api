import { Operation } from 'express-openapi'
import OtomiStack from '../otomi-stack'
import { OpenApiRequestExt } from '../otomi-models'
import { cleanEnv, CLUSTER_ID, CORE_VERSION } from '../validators'
import pkg from '../../package.json'

const env = cleanEnv({
  CLUSTER_ID,
  CORE_VERSION,
})

export default function (otomi: OtomiStack) {
  const GET: Operation = [
    (req: OpenApiRequestExt, res) => {
      const data = {
        clusters: otomi.getClusters(),
        cluster: otomi.getCluster(),
        core: otomi.getCore(),
        user: req.user,
        teams: otomi.getTeams(),
        isDirty: otomi.db.isDirty(),
        versions: {
          core: env.CORE_VERSION,
          api: pkg.version,
        },
      }
      res.status(200).json(data)
    },
  ]
  const api = {
    GET,
  }
  return api
}
