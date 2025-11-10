import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt, Service } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:services')

/**
 * GET /v1/teams/{teamId}/services/{serviceName}
 * Get a specific service
 */
export const getService = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId, serviceName } = req.params
  debug(`getService(${serviceName})`)
  const data = req.otomi.getService(decodeURIComponent(teamId), decodeURIComponent(serviceName))
  res.json(data)
}

/**
 * PUT /v1/teams/{teamId}/services/{serviceName}
 * Edit a service
 */
export const editService = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, serviceName } = req.params
  debug(`editService(${serviceName})`)
  const data = await req.otomi.editService(decodeURIComponent(teamId), decodeURIComponent(serviceName), {
    ...req.body,
  } as Service)
  res.json(data)
}

/**
 * DELETE /v1/teams/{teamId}/services/{serviceName}
 * Delete a service
 */
export const deleteService = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, serviceName } = req.params
  debug(`deleteService(${serviceName})`)
  await req.otomi.deleteService(decodeURIComponent(teamId), decodeURIComponent(serviceName))
  res.json({})
}
