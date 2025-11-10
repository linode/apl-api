import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:workloadCatalog')

/**
 * POST /v1/workloadCatalog
 * Get workload catalog
 */
export const getWorkloadCatalog = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug(`workloadCatalog(${req.body.name})`)
  const data = await req.otomi.getWorkloadCatalog(req.body)
  res.json(data)
}
