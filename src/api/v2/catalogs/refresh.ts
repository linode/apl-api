import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:catalogs:refresh')

/**
 * POST /v2/catalogs/refresh
 * Refresh BYO catalog cache(s) immediately
 */
export const refreshAplCatalogCache = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const catalogId = typeof req.query.catalogId === 'string' ? decodeURIComponent(req.query.catalogId) : undefined
  debug(`refreshAplCatalogCache(${catalogId || 'all'})`)
  const data = await req.otomi.refreshBYOCatalogCache(catalogId)
  res.json(data)
}
