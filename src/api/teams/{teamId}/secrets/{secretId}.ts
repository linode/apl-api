import { Operation } from 'express-openapi'
import OtomiStack from '../../../../otomi-stack'
import { OpenApiRequest } from '../../../../api.d'

export default function (otomi: OtomiStack) {
  const DELETE: Operation = [
    ({ params: { secretId } }: OpenApiRequest, res) => {
      console.debug(`Delete secret: ${JSON.stringify({ secretId })}`)
      otomi.deleteSecret(decodeURIComponent(secretId))
      res.status(200).json({})
    },
  ]
  const GET: Operation = [
    ({ params: { secretId } }: OpenApiRequest, res) => {
      console.debug(`Get secret: ${JSON.stringify({ secretId })}`)
      const data = otomi.getSecret(decodeURIComponent(secretId))
      res.status(200).json(data)
    },
  ]
  const PUT: Operation = [
    ({ params: { secretId }, body }: OpenApiRequest, res) => {
      console.debug(`Modify secret: ${JSON.stringify({ secretId })}`)
      const data = otomi.editSecret(decodeURIComponent(secretId), body)
      res.status(200).json(data)
    },
  ]
  const api = {
    DELETE,
    GET,
    PUT,
  }
  return api
}
