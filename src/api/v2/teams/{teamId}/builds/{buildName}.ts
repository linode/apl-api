import Debug from 'debug'
import { Response } from 'express'
import { AplBuildRequest, DeepPartial, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:builds')

/**
 * GET /v2/teams/{teamId}/builds/{buildName}
 * Get a specific build (APL format)
 */
export const getAplBuild = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId, buildName } = req.params
  debug(`getBuild(${buildName})`)
  const data = req.otomi.getAplBuild(decodeURIComponent(teamId), decodeURIComponent(buildName))
  res.json(data)
}

/**
 * PUT /v2/teams/{teamId}/builds/{buildName}
 * Edit a build (APL format)
 */
export const editAplBuild = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId, buildName } = req.params
  debug(`editBuild(${buildName})`)
  const data = req.otomi.editAplBuild(
    decodeURIComponent(teamId),
    decodeURIComponent(buildName),
    req.body as AplBuildRequest,
  )
  res.json(data)
}

/**
 * PATCH /v2/teams/{teamId}/builds/{buildName}
 * Partially update a build (APL format)
 */
export const patchAplBuild = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId, buildName } = req.params
  debug(`editBuild(${buildName}, patch)`)
  const data = req.otomi.editAplBuild(
    decodeURIComponent(teamId),
    decodeURIComponent(buildName),
    req.body as DeepPartial<AplBuildRequest>,
    true,
  )
  res.json(data)
}

/**
 * DELETE /v2/teams/{teamId}/builds/{buildName}
 * Delete a build
 */
export const deleteAplBuild = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, buildName } = req.params
  debug(`deleteBuild(${buildName})`)
  await req.otomi.deleteBuild(decodeURIComponent(teamId), decodeURIComponent(buildName))
  res.json({})
}
