import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:settingsinfo')

/**
 * GET /v1/settingsInfo
 * Get settings info
 */
export const getSettingsInfo = (req: OpenApiRequestExt, res: Response): void => {
  debug('getSettingsInfo')
  res.json(req.otomi.getSettingsInfo())
}
