import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:catalogs')

/**
 * GET /v2/catalogs/{catalogId}
 * Get a specific catalog
 */
export const getCatalog = (req: OpenApiRequestExt, res: Response): void => {
  const { catalogId } = req.params
  debug(`getCatalog(${catalogId})`)
  // const data = req.otomi.getAplCatalog(decodeURIComponent(catalogId))
  // res.json(data)
}

/**
 * PUT /v2/catalogs/{catalogId}
 * Edit a catalog
 */
export const editCatalog = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { catalogId } = req.params
  debug(`editCatalog(${catalogId})`)
  // const data = await req.otomi.editAplCatalog(decodeURIComponent(catalogId), req.body as AplCatalogRequest)
  // res.json(data)
}

/**
 * PATCH /v2/catalogs/{catalogId}
 * Partially update a catalog
 */
export const patchAplCatalog = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { catalogId } = req.params
  debug(`editCatalog(${catalogId}, patch)`)
  // const data = await req.otomi.editAplCatalog(catalogId, req.body as AplCatalogRequest, true)
  // res.json(data)
}

/**
 * DELETE /v2/catalogs/{catalogId}
 * Delete a catalog
 */
export const deleteCatalog = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { catalogId } = req.params
  debug(`deleteCatalog(${catalogId})`)
  // await req.otomi.deleteAplCatalog(decodeURIComponent(catalogId))
  // res.json({})
}
