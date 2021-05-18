import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../otomi-stack'
import { OpenApiRequestExt } from '../otomi-models'
import { cleanEnv, CLUSTER_ID, CORE_VERSION } from '../validators'
import pkg from '../../package.json'

const env = cleanEnv({
  CLUSTER_ID,
  CORE_VERSION,
})

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    (req: OpenApiRequestExt, res): void => {
      const data = {
        cluster: otomi.getCluster(),
        core: otomi.getCore(),
        dns: otomi.getSettings().dns,
        user: req.user,
        teams: otomi.getTeams(),
        isDirty: otomi.db.isDirty(),
        versions: {
          core: env.CORE_VERSION,
          api: pkg.version,
        },
      }
      res.json(data)
    },
  ]
  const api = {
    GET,
  }
  return api
}
