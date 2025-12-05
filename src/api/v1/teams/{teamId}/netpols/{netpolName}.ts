import Debug from 'debug'
import { Response } from 'express'
import { Netpol, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:teams:netpols')

/**
 * GET /v1/teams/{teamId}/netpols/{netpolName}
 * Get a specific network policy
 */
export const getNetpol = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId, netpolName } = req.params
  debug(`getNetpol(${netpolName})`)
  const data = req.otomi.getNetpol(decodeURIComponent(teamId), decodeURIComponent(netpolName))
  res.json(data)
}

/**
 * PUT /v1/teams/{teamId}/netpols/{netpolName}
 * Edit a network policy
 */
export const editNetpol = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, netpolName } = req.params
  debug(`editNetpol(${netpolName})`)
  const data = await req.otomi.editNetpol(decodeURIComponent(teamId), decodeURIComponent(netpolName), {
    ...req.body,
  } as Netpol)
  res.json(data)
}

/**
 * DELETE /v1/teams/{teamId}/netpols/{netpolName}
 * Delete a network policy
 */
export const deleteNetpol = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, netpolName } = req.params
  debug(`deleteNetpol(${netpolName})`)
  await req.otomi.deleteNetpol(decodeURIComponent(teamId), decodeURIComponent(netpolName))
  res.json({})
}
