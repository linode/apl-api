import Debug from 'debug'
import { Response } from 'express'
import { ensureStatus } from 'src/api/response-utils'
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
  res.json(ensureStatus(data))
}

/**
 * PUT /v2/teams/{teamId}/builds/{buildName}
 * Edit a build (APL format)
 */
export const editAplBuild = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, buildName } = req.params
  debug(`editBuild(${buildName})`)
  const data = await req.otomi.editAplBuild(
    decodeURIComponent(teamId),
    decodeURIComponent(buildName),
    req.body as AplBuildRequest,
  )
  res.json(ensureStatus(data))
}

/**
 * PATCH /v2/teams/{teamId}/builds/{buildName}
 * Partially update a build (APL format)
 */
export const patchAplBuild = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, buildName } = req.params
  debug(`editBuild(${buildName}, patch)`)
  const data = await req.otomi.editAplBuild(
    decodeURIComponent(teamId),
    decodeURIComponent(buildName),
    req.body as DeepPartial<AplBuildRequest>,
    true,
  )
  res.json(ensureStatus(data))
}

/**
 * DELETE /v2/teams/{teamId}/builds/{buildName}
 * Delete a build
 */
export const deleteAplBuild = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, buildName } = req.params
  debug(`deleteBuild(${buildName})`)
  await req.otomi.deleteAplBuild(decodeURIComponent(teamId), decodeURIComponent(buildName))
  res.status(200).end()
}
