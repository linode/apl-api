import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequest } from '../../../../otomi-models'
import OtomiStack from '../../../../otomi-stack'

const debug = Debug('otomi:api:teams:secrets')

export default function (otomi: OtomiStack): OperationHandlerArray {
  const DELETE: Operation = [
    ({ params: { secretId } }: OpenApiRequest, res): void => {
      debug(`deleteSecret(${secretId})`)
      otomi.deleteSecret(decodeURIComponent(secretId))
      res.json({})
    },
  ]
  const GET: Operation = [
    ({ params: { secretId } }: OpenApiRequest, res): void => {
      debug(`getSecret(${secretId})`)
      const data = otomi.getSecret(decodeURIComponent(secretId))
      res.json(data)
    },
  ]
  const PUT: Operation = [
    ({ params: { teamId, secretId }, body }: OpenApiRequest, res): void => {
      debug(`editSecret(${secretId})`)
      const data = otomi.editSecret(decodeURIComponent(secretId), { ...body, teamId: decodeURIComponent(teamId) })
      res.json(data)
    },
  ]
  const api = {
    DELETE,
    GET,
    PUT,
  }
  return api
}
