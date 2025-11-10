import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:settings')

/**
 * GET /v1/settings
 * Get settings (optionally filtered by IDs)
 */
export const getSettings = (req: OpenApiRequestExt, res: Response): void => {
  const { ids } = req.query
  // Handle comma-separated string or array
  const idsArray = ids ? (typeof ids === 'string' ? ids.split(',') : (ids as string[])) : undefined
  debug(`getSettings(${idsArray})`)
  const v = req.otomi.getSettings(idsArray)
  if (v?.otomi) {
    const { otomi: otomiSettings, ...restSettings } = v
    // Remove the otomi.adminPassword from otomi settings response
    const { adminPassword, ...restOtomiSettings } = otomiSettings
    res.json({ ...restSettings, otomi: restOtomiSettings })
  } else {
    res.json(v)
  }
}
