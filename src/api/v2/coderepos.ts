import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:codeRepos')

/**
 * GET /v2/coderepos
 * Get all code repositories across all teams (APL format)
 */
export const getAllAplCodeRepos = (req: OpenApiRequestExt, res: Response): void => {
  debug('getAllCodeRepos')
  const v = req.otomi.getAllAplCodeRepos()
  res.json(v)
}
