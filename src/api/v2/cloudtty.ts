import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:cloudtty')

/**
 * GET /v2/cloudtty
 * Connect to CloudTTY
 */
export const connectCloudtty = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const sessionUser = req.user
  debug(`connectCloudtty - ${sessionUser.email} - ${sessionUser.sub}`)
  const { teamId } = req.query as { teamId: string }
  const v = await req.otomi.connectCloudtty(teamId, sessionUser)
  res.json(v)
}

/**
 * DELETE /v2/cloudtty
 * Delete CloudTTY connection
 */
export const deleteCloudtty = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const sessionUser = req.user
  debug(`deleteCloudtty - ${sessionUser.email} - ${sessionUser.sub}`)
  await req.otomi.deleteCloudtty(sessionUser)
  res.json({})
}
