import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:dockerConfig')

export const parameters = []

/**
 * GET /v1/dockerconfig/{teamId}
 * Get Docker config for a team
 */
export const getDockerConfig = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.params
  debug(`getDockerConfig(${teamId})`)
  const config = await req.otomi.getDockerConfig(teamId)
  res.setHeader('Content-type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename=docker-team-${teamId}.json`)
  res.send(config)
}
