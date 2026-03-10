import Debug from 'debug'
import { Response } from 'express'
import { BadRequestError } from 'src/error'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:catalogs:refresh')

/**
 * POST /v2/catalogs/refresh
 * Refresh BYO catalog cache(s) immediately
 */
export const refreshAplCatalogCache = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const catalogId = typeof req.query.catalogId === 'string' ? decodeURIComponent(req.query.catalogId) : undefined
  debug(`refreshAplCatalogCache(${catalogId || 'all'})`)
  try {
    await req.otomi.refreshBYOCatalogCache(catalogId)
    res.status(200).json({ code: 200, message: 'Successfully refreshed catalog cache' })
  } catch (e) {
    debug('refreshAplCatalogCache failed', e)
    res.status(400).json(new BadRequestError('Failed to refresh catalog cache'))
  }
}
