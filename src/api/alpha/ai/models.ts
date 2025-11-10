import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:alpha:ai:models')

/**
 * GET /alpha/ai/models
 * Get all AI models
 */
export const getAIModels = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('getAIModels')
  const v = await req.otomi.getAllAIModels()
  res.json(v)
}
