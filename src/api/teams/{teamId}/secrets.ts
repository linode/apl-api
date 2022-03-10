import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequest } from '../../../otomi-models'
import OtomiStack from '../../../otomi-stack'

const debug = Debug('otomi:api:teams:secrets')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const GET: Operation = [
    ({ params: { teamId } }: OpenApiRequest, res): void => {
      debug(`getSecrets(${teamId})`)
      const v = otomi.getSecrets(teamId)
      res.json(v)
    },
  ]
  const POST: Operation = [
    ({ params: { teamId }, body }: OpenApiRequest, res): void => {
      debug(`createSecret(${teamId}, ...)`)
      const v = otomi.createSecret(teamId, body)
      res.json(v)
    },
  ]
  const api = {
    GET,
    POST,
  }
  return api
}
