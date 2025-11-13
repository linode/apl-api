import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:dashboard')

/**
 * GET /v1/dashboard
 * Get dashboard information
 */
export const getDashboard = (req: OpenApiRequestExt, res: Response): void => {
  const { teamName } = req.query
  debug(`getDashboard(${teamName})`)
  const v = req.otomi.getDashboard(teamName as string)
  res.json(v)
}
