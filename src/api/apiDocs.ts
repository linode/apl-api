import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequest } from 'src/otomi-models'
import { getSpec } from '../app'

const debug = Debug('otomi:api')

/**
 * GET /apiDocs
 * Get OpenAPI documentation
 */
export const getApiDoc = (req: OpenApiRequest, res: Response): void => {
  debug('apiDocs')
  res.json(getSpec().spec)
}
