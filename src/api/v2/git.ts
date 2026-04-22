import Debug from 'debug'
import { Response } from 'express'
import { BadRequestError } from 'src/error'
import { lockApi } from 'src/middleware/session'
import { OpenApiRequestExt } from 'src/otomi-models'

const debug = Debug('otomi:api:v2:git')

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
  const { repoUrl, username, password, email, branch } = req.body as {
    repoUrl: string
    username?: string
    password: string
    email: string
    branch: string
  }

  // Validate new remote connectivity; returns true if remote already has content
  let remoteHasContent: boolean
  try {
    remoteHasContent = await req.otomi.git.testRemoteConnection(repoUrl, password, branch, username)
  } catch (e: any) {
    throw new BadRequestError(`Cannot connect to new git remote: ${e.message}`)
  }

  // Write config + commit locally → push to new remote (if empty) → push to current remote
  await req.otomi.migrateGitSettings({ repoUrl, username, password, email, branch, remoteHasContent })

  await lockApi()

  res.json({})
}
