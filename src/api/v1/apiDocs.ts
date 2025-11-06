import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequest } from 'src/otomi-models'

const debug = Debug('otomi:v1:api')

/**
 * GET /v1/apiDocs
 * Get OpenAPI documentation
 */
export const getApiDoc = (req: OpenApiRequest, res: Response): void => {
  debug('apiDocs')
  res.json(req.apiDoc)
}
