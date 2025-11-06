import Debug from 'debug'
import { Response } from 'express'
import { AplServiceRequest, DeepPartial, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:services')

/**
 * GET /v2/teams/{teamId}/services/{serviceName}
 * Get a specific service (APL format)
 */
export const getAplService = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId, serviceName } = req.params
  debug(`getService(${serviceName})`)
  const data = req.otomi.getAplService(decodeURIComponent(teamId), decodeURIComponent(serviceName))
  res.json(data)
}

/**
 * PUT /v2/teams/{teamId}/services/{serviceName}
 * Edit a service (APL format)
 */
export const editAplService = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, serviceName } = req.params
  debug(`editService(${serviceName})`)
  const data = await req.otomi.editAplService(
    decodeURIComponent(teamId),
    decodeURIComponent(serviceName),
    req.body as AplServiceRequest,
  )
  res.json(data)
}

/**
 * PATCH /v2/teams/{teamId}/services/{serviceName}
 * Partially update a service (APL format)
 */
export const patchAplService = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, serviceName } = req.params
  debug(`editService(${serviceName}, patch)`)
  const data = await req.otomi.editAplService(
    decodeURIComponent(teamId),
    decodeURIComponent(serviceName),
    req.body as DeepPartial<AplServiceRequest>,
    true,
  )
  res.json(data)
}

/**
 * DELETE /v2/teams/{teamId}/services/{serviceName}
 * Delete a service
 */
export const deleteAplService = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, serviceName } = req.params
  debug(`deleteService(${serviceName})`)
  await req.otomi.deleteService(decodeURIComponent(teamId), decodeURIComponent(serviceName))
  res.json({})
}
