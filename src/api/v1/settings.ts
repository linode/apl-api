import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:settings')

/**
 * GET /v1/settings
 * Get settings (optionally filtered by IDs)
 */
export const getSettings = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { ids } = req.query
  // Handle comma-separated string or array
  const idsArray = ids ? (typeof ids === 'string' ? ids.split(',') : (ids as string[])) : undefined
  debug(`getSettings(${idsArray})`)
  const v = await req.otomi.getSettings(idsArray)
  res.json(v)
}
