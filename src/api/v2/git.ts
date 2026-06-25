import Debug from 'debug'
import { Response } from 'express'
import { GitConfig, OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:git')

/**
 * GET /v2/git
 * Returns the configured external Git settings.
 */
export const getGitSettings = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('getGitSettings')

  const gitSettings = await req.otomi.getGitSettings()

  res.json(gitSettings)
}

/**
 * PUT /v2/git
 * Migrate the values repository to a new git remote.
 * Flow:
 *   1. Validate connectivity to new remote (400 on failure)
 *   2. Write + commit git config locally, push to new remote first (so new remote has correct config),
 *      then push to current remote (so operator picks up the switch)
 *   3. Lock API
 */
export const migrateGit = async (req: OpenApiRequestExt, res: Response): Promise<void> => {
  debug('migrateGit')
  const newGitConfig = req.body as GitConfig

  // Validate new remote connectivity; returns true if remote already has content
  let remoteHasContent: boolean
  try {
    remoteHasContent = await req.otomi.git.testRemoteConnection(newGitConfig)
  } catch (e: any) {
    if (e.message.includes('not found')) {
      const error = { message: `Cannot connect to new git remote`, statusCode: 404 }
      res.json(error)
      return
    } else {
      const error = { message: `Error connecting to new git remote`, statusCode: 400 }
      res.json(error)
      return
    }
  }
  if (remoteHasContent) {
    res.json({ message: 'New repository is not empty', statusCode: 400 })
    return
  }

  // Write config and push to new remote
  await req.otomi.migrateGitSettings(newGitConfig)

  res.json({})
}
