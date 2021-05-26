import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../otomi-stack'
import { OpenApiRequestExt } from '../otomi-models'
import { cleanEnv, CORE_VERSION } from '../validators'
import pkg from '../../package.json'

const env = cleanEnv({
  CORE_VERSION,
})

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    (req: OpenApiRequestExt, res): void => {
      const data = otomi.getSession(req.user, pkg.version, env.CORE_VERSION)
      res.json(data)
    },
  ]
  const api = {
    GET,
  }
  return api
}
