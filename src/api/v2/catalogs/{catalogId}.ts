import Debug from 'debug'
import { Response } from 'express'
import { AplCatalogRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:catalogs')

/**
 * GET /v2/catalogs/{catalogId}
 * Get a specific catalog
 */
export const getAplCatalog = (req: OpenApiRequestExt, res: Response): void => {
  const { catalogId } = req.params
  debug(`getAplCatalog(${catalogId})`)
  const data = req.otomi.getAplCatalog(decodeURIComponent(catalogId))
  res.json(data)
}

/**
 * PUT /v2/catalogs/{catalogId}
 * Edit a catalog
 */
export const editAplCatalog = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { catalogId } = req.params
  debug(`editAplCatalog(${catalogId})`)
  const data = await req.otomi.editAplCatalog(decodeURIComponent(catalogId), req.body as AplCatalogRequest)
  res.json(data)
}

/**
 * PATCH /v2/catalogs/{catalogId}
 * Partially update a catalog
 */
export const patchAplCatalog = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { catalogId } = req.params
  debug(`patchAplCatalog(${catalogId})`)
  const data = await req.otomi.editAplCatalog(decodeURIComponent(catalogId), req.body as AplCatalogRequest, true)
  res.json(data)
}

/**
 * DELETE /v2/catalogs/{catalogId}
 * Delete a catalog
 */
export const deleteAplCatalog = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { catalogId } = req.params
  debug(`deleteAplCatalog(${catalogId})`)
  await req.otomi.deleteAplCatalog(decodeURIComponent(catalogId))
  res.json({})
}

// /**
//  * GET /v2/catalogs/{catalogId}/charts
//  * Get charts for a specific catalog
//  */
// export const getAplCatalogsCharts = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
//   const { catalogId } = req.params
//   debug(`getAplCatalog(${catalogId})`)
//   const data = req.otomi.getAplCatalogCharts(decodeURIComponent(catalogId))
//   res.json(data)
// }

// /**
//  * GET /v2/catalogs/{catalogId}/charts
//  * Get charts for a specific catalog
//  */
// export const getAplCatalogsCharts = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
//   const { catalogId } = req.params
//   debug(`getAplCatalogsCharts(${catalogId})`)
//   const data = req.otomi.getBYOWorkloadCatalog(req.body)
//   res.json(data)
// }
