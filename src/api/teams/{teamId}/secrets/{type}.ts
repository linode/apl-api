import { Operation } from 'express-openapi'
import OtomiStack from '../../../../otomi-stack'

export default function (otomi: OtomiStack) {
  const GET: Operation = [
    async ({ params: { teamId, type } }, res, next) => {
      console.debug(`Get secrets: ${JSON.stringify({ teamId, type })}`)
      let v
      if (type === 'pull') v = await otomi.getPullSecrets(teamId)
      // else v = otomi.getSecrets(req.params.teamId)
      res.status(200).json(v)
    },
  ]
  const POST: Operation = [
    ({ params: { teamId, type, body } }: any, res, next) => {
      console.debug(`Create a new secret: ${JSON.stringify({ teamId, type, body })}`)
      const v = otomi.createService({ teamId, ...body })
      res.status(200).json(v)
    },
  ]
  const api = {
    GET,
    POST,
  }
  return api
}
