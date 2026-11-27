import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v1:maintenance')

/**
 * POST /v1/maintenance/import-keycloak-users
 * Import Keycloak users into Dex
 */
export const importKeycloakUsers = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('importKeycloakUsers')
  res.json(await req.otomi.importKeycloakUsers())
}

/**
 * POST /v1/maintenance/delete-gitea-users
 * Delete Gitea users (and their personal repositories) so they can log in again through Dex
 */
export const deleteGiteaUsers = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  const dryRun = String(req.query.dryRun) === 'true'
  debug('deleteGiteaUsers', { dryRun })
  res.json(await req.otomi.deleteGiteaUsers(dryRun))
}
