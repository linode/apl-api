import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:status')

/**
 * GET /v2/status
 * Returns the current API status including the locked state.
 */
export const getApiStatus = (req: OpenApiRequestExt, res: Response): void => {
  debug('getApiStatus')
  res.json(req.otomi.getApiStatus())
}
