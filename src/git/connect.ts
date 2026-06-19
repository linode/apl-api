import Debug from 'debug'
import { GitConfig } from '../otomi-models'
import { Git } from '../git'

const debug = Debug('otomi:git-connect')

export function getProtocol(url: string | undefined): string {
  return url && url.includes('://') ? url.split('://')[0] : 'file'
}

export function getAuthenticatedUrl(gitConfig: GitConfig): string {
  const protocol = getProtocol(gitConfig.repoUrl)
  if (protocol === 'file') {
    return gitConfig.repoUrl
  }
  const { repoUrl, username, password } = gitConfig
  const url = new URL(repoUrl)
  if (username) {
    url.username = username
    url.password = password
  } else {
    url.username = password
    url.password = ''
  }
  return url.toString()
}

export default async function getLatestRemoteCommitSha(git: Git): Promise<string | undefined> {
  try {
    const result = await git.git.listRemote(['--refs', git.remote, `refs/heads/${git.branch}`])
    const [sha] = result.trim().split(/\s/)
    if (!sha) {
      debug('No remote commit found for branch %s', git.branch)
      return undefined
    }
    return sha
  } catch (error: any) {
    debug('Git remote error: ', error.message)
    return undefined
  }
}
