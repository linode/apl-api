import Debug from 'debug'
import { Response } from 'express'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:sealedsecrets')

/**
 * GET /v2/sealedsecrets
 * Get all sealed secrets across all teams (APL format)
 */
export const getAllAplSealedSecrets = (req: OpenApiRequestExt, res: Response): void => {
  debug('getAllSealedSecrets')
  const all = req.otomi.getAllAplSealedSecrets()
  // Defense in depth: filter even if ACL is misconfigured.
  const v = req.user.isPlatformAdmin
    ? all
    : all.filter((secret) => {
        const namespace = secret.metadata.namespace
        const teamId = namespace?.startsWith('team-')
          ? namespace.slice('team-'.length)
          : (secret.metadata.labels?.['apl.io/teamId'] as string)
        return teamId && req.user.teams.includes(teamId)
      })
  res.json(v)
}
