import Debug from 'debug'
import { Response } from 'express'
import { AplCatalogRequest, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:catalogs')

/**
 * GET /v2/catalogs
 * Get all catalogs
 */
export const getAllAplCatalogs = (req: OpenApiRequestExt, res: Response): void => {
  debug('getAllCatalogs')
  const v = req.otomi.getAllAplCatalogs()
  res.json(v)
}

/**
 * POST /v2/catalogs
 * Create a catalog
 */
export const createAplCatalog = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('createCatalog')
  const data = await req.otomi.createAplCatalog(req.body as AplCatalogRequest)
  res.json(data)
}
