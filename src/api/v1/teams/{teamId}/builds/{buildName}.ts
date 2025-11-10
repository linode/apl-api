import Debug from 'debug'
import { Response } from 'express'
import { Build, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:builds')

/**
 * GET /v1/teams/{teamId}/builds/{buildName}
 * Get a specific build
 */
export const getBuild = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId, buildName } = req.params
  debug(`getBuild(${buildName})`)
  const data = req.otomi.getBuild(decodeURIComponent(teamId), decodeURIComponent(buildName))
  res.json(data)
}

/**
 * PUT /v1/teams/{teamId}/builds/{buildName}
 * Edit a build
 */
export const editBuild = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId, buildName } = req.params
  debug(`editBuild(${buildName})`)
  const data = req.otomi.editBuild(decodeURIComponent(teamId), decodeURIComponent(buildName), {
    ...req.body,
  } as Build)
  res.json(data)
}

/**
 * DELETE /v1/teams/{teamId}/builds/{buildName}
 * Delete a build
 */
export const deleteBuild = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, buildName } = req.params
  debug(`deleteBuild(${buildName})`)
  await req.otomi.deleteBuild(decodeURIComponent(teamId), decodeURIComponent(buildName))
  res.json({})
}
