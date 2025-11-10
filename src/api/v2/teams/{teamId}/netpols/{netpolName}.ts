import Debug from 'debug'
import { Response } from 'express'
import { AplNetpolRequest, DeepPartial, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:teams:netpols')

/**
 * GET /v2/teams/{teamId}/netpols/{netpolName}
 * Get a specific network policy (APL format)
 */
export const getAplNetpol = (req: OpenApiRequestExt, res: Response): void => {
  const { teamId, netpolName } = req.params
  debug(`getNetpol(${netpolName})`)
  const data = req.otomi.getAplNetpol(decodeURIComponent(teamId), decodeURIComponent(netpolName))
  res.json(data)
}

/**
 * PUT /v2/teams/{teamId}/netpols/{netpolName}
 * Edit a network policy (APL format)
 */
export const editAplNetpol = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, netpolName } = req.params
  debug(`editNetpol(${netpolName})`)
  const data = await req.otomi.editAplNetpol(
    decodeURIComponent(teamId),
    decodeURIComponent(netpolName),
    req.body as AplNetpolRequest,
  )
  res.json(data)
}

/**
 * PATCH /v2/teams/{teamId}/netpols/{netpolName}
 * Partially update a network policy (APL format)
 */
export const patchAplNetpol = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, netpolName } = req.params
  debug(`editNetpol(${netpolName}, patch)`)
  const data = await req.otomi.editAplNetpol(
    decodeURIComponent(teamId),
    decodeURIComponent(netpolName),
    req.body as DeepPartial<AplNetpolRequest>,
    true,
  )
  res.json(data)
}

/**
 * DELETE /v2/teams/{teamId}/netpols/{netpolName}
 * Delete a network policy
 */
export const deleteAplNetpol = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const { teamId, netpolName } = req.params
  debug(`deleteNetpol(${netpolName})`)
  await req.otomi.deleteNetpol(decodeURIComponent(teamId), decodeURIComponent(netpolName))
  res.json({})
}
