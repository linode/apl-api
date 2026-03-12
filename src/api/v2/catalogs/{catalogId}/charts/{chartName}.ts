import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:catalogs:charts:chartname')

/**
 * GET /v2/catalogs/{catalogId}/charts/{chartName}
 * Get a single chart for a specific catalog
 */
export const getAplCatalogsChart = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { catalogId, chartName } = req.params
  debug(`getAplCatalogChart(${catalogId}, ${chartName})`)

  const data = await req.otomi.getAplCatalogChart(decodeURIComponent(catalogId), decodeURIComponent(chartName))

  res.json(data)
}
