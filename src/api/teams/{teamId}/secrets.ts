import { Operation } from 'express-openapi'
import OtomiStack from '../../../otomi-stack'
import { OpenApiRequest } from '../../../api.d'

export default function (otomi: OtomiStack) {
  const GET: Operation = [
    async ({ params: { teamId } }: OpenApiRequest, res, next) => {
      console.debug(`Get team secrets: ${JSON.stringify({ teamId })}`)
      const v = await otomi.getSecrets(teamId)
      res.status(200).json(v)
    },
  ]
  const POST: Operation = [
    ({ params: { teamId }, body }: OpenApiRequest, res, next) => {
      console.debug(`Create a new secret: ${JSON.stringify({ teamId, body })}`)
      const v = otomi.createSecret(teamId, body)
      res.status(200).json(v)
    },
  ]
  const api = {
    GET,
    POST,
  }
  return api
}
