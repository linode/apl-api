import Debug from 'debug'
import { Response } from 'express'
import { AplCodeRepoRequest, DeepPartial, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:codeRepos')

/**
 * GET /v2/teams/{teamId}/coderepos/{codeRepositoryName}
 * Get a specific code repository (APL format)
 */
export const getAplCodeRepo = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId, codeRepositoryName } = req.params
  debug(`getCodeRepo(${codeRepositoryName})`)
  const data = req.otomi.getAplCodeRepo(decodeURIComponent(teamId), decodeURIComponent(codeRepositoryName))
  res.json(data)
}

/**
 * PUT /v2/teams/{teamId}/coderepos/{codeRepositoryName}
 * Edit a code repository (APL format)
 */
export const editAplCodeRepo = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, codeRepositoryName } = req.params
  debug(`editCodeRepo(${codeRepositoryName})`)
  const data = await req.otomi.editAplCodeRepo(
    decodeURIComponent(teamId),
    decodeURIComponent(codeRepositoryName),
    req.body as AplCodeRepoRequest,
  )
  res.json(data)
}

/**
 * PATCH /v2/teams/{teamId}/coderepos/{codeRepositoryName}
 * Partially update a code repository (APL format)
 */
export const patchAplCodeRepo = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, codeRepositoryName } = req.params
  debug(`editCodeRepo(${codeRepositoryName}, patch)`)
  const data = await req.otomi.editAplCodeRepo(
    decodeURIComponent(teamId),
    decodeURIComponent(codeRepositoryName),
    req.body as DeepPartial<AplCodeRepoRequest>,
    true,
  )
  res.json(data)
}

/**
 * DELETE /v2/teams/{teamId}/coderepos/{codeRepositoryName}
 * Delete a code repository
 */
export const deleteAplCodeRepo = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, codeRepositoryName } = req.params
  debug(`deleteCodeRepo(${codeRepositoryName})`)
  await req.otomi.deleteCodeRepo(decodeURIComponent(teamId), decodeURIComponent(codeRepositoryName))
  res.json({})
}
