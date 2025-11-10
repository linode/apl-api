import Debug from 'debug'
import { Response } from 'express'
import { CodeRepo, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:codeRepos')

/**
 * GET /v1/teams/{teamId}/coderepos/{codeRepositoryName}
 * Get a specific code repository
 */
export const getCodeRepo = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId, codeRepositoryName } = req.params
  debug(`getCodeRepo(${codeRepositoryName})`)
  const data = req.otomi.getCodeRepo(decodeURIComponent(teamId), decodeURIComponent(codeRepositoryName))
  res.json(data)
}

/**
 * PUT /v1/teams/{teamId}/coderepos/{codeRepositoryName}
 * Edit a code repository
 */
export const editCodeRepo = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, codeRepositoryName } = req.params
  debug(`editCodeRepo(${codeRepositoryName})`)
  const data = await req.otomi.editCodeRepo(decodeURIComponent(teamId), decodeURIComponent(codeRepositoryName), {
    ...req.body,
  } as CodeRepo)
  res.json(data)
}

/**
 * DELETE /v1/teams/{teamId}/coderepos/{codeRepositoryName}
 * Delete a code repository
 */
export const deleteCodeRepo = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, codeRepositoryName } = req.params
  debug(`deleteCodeRepo(${codeRepositoryName})`)
  await req.otomi.deleteCodeRepo(decodeURIComponent(teamId), decodeURIComponent(codeRepositoryName))
  res.json({})
}
