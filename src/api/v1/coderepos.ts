import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:codeRepos')

/**
 * GET /v1/coderepos
 * Get all code repositories across all teams
 */
export const getAllCodeRepos = (req: OpenApiRequestExt, res: Response): void => {
  debug('getAllCodeRepos')
  const v = req.otomi.getAllCodeRepos()
  res.json(v)
}
