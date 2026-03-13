import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:settingsinfo')

/**
 * GET /v1/settingsInfo
 * Get settings info
 */
export const getSettingsInfo = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('getSettingsInfo')
  res.json(await req.otomi.getSettingsInfo())
}
