import Debug from 'debug'
import { Operation, OperationHandlerArray } from 'express-openapi'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:dockerConfig')

export const parameters = []

export default function (): OperationHandlerArray {
  const get: Operation = [
    async ({ otomi, params: { teamId } }: OpenApiRequestExt, res): Promise<void> => {
      debug(`getDockerConfig(${teamId})`)
      const config = await otomi.getDockerConfig(teamId)
      res.setHeader('Content-type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename=docker-team-${teamId}.json`)
      res.send(config)
    },
  ]
  const api = {
    get,
  }
  return api
}
