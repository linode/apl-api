import { Operation, OperationHandlerArray } from 'express-openapi'
import OtomiStack from '../../../../otomi-stack'
import { OpenApiRequest } from '../../../../otomi-models'

export default function (otomi: OtomiStack): OperationHandlerArray {
  const DELETE: Operation = [
    ({ params: { secretId } }: OpenApiRequest, res): void => {
      console.debug(`Delete secret: ${JSON.stringify({ secretId })}`)
      otomi.deleteSecret(decodeURIComponent(secretId))
      res.json({})
    },
  ]
  const GET: Operation = [
    ({ params: { secretId } }: OpenApiRequest, res): void => {
      console.debug(`Get secret: ${JSON.stringify({ secretId })}`)
      const data = otomi.getSecret(decodeURIComponent(secretId))
      res.json(data)
    },
  ]
  const PUT: Operation = [
    ({ params: { secretId }, body }: OpenApiRequest, res): void => {
      console.debug(`Modify secret: ${JSON.stringify({ secretId })}`)
      const data = otomi.editSecret(decodeURIComponent(secretId), body)
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
