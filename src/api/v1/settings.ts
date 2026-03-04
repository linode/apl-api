import Debug from 'debug'
import { Response } from 'express'
import { omit } from 'lodash'
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
    res.json(omit(v, ['otomi.adminPassword', 'otomi.git.password']))
  } else {
    res.json(v)
  }
}
