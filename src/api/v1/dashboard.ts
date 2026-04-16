import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:dashboard')

/**
 * GET /v1/dashboard
 * Get dashboard information
 */
export const getDashboard = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId } = req.query
  debug(`getDashboard(${teamId})`)
  const v = await req.otomi.getDashboard(teamId as string)
  res.json(v)
}
