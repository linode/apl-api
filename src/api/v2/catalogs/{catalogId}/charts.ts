import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:catalogs:charts')

/**
 * GET /v2/catalogs/{catalogId}/charts
 * Get charts for a specific catalog
 */
export const getAplCatalogsCharts = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { catalogId } = req.params
  debug(`getAplCatalog(${catalogId})`)
  const data = await req.otomi.getAplCatalogCharts(decodeURIComponent(catalogId))
  res.json(data)
}
