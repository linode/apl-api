import Debug from 'debug'
import simpleGit from 'simple-git'
import { cleanEnv, GIT_BRANCH, GIT_PASSWORD, GIT_REPO_URL, GIT_USER } from 'src/validators'

const debug = Debug('otomi:git-connect')

const env = cleanEnv({
  GIT_REPO_URL,
  GIT_BRANCH,
  GIT_USER,
  GIT_PASSWORD,
})

export default async function getLatestRemoteCommitSha(): Promise<string | undefined> {
  try {
    const git = simpleGit()
    const repoUrl = new URL(env.GIT_REPO_URL)
    repoUrl.username = encodeURIComponent(env.GIT_USER)
    repoUrl.password = encodeURIComponent(env.GIT_PASSWORD)
    const result = await git.listRemote(['--refs', repoUrl.toString(), env.GIT_BRANCH])
    const [sha] = result.trim().split(/\s/)
    if (!sha) {
      debug('No remote commit found for branch %s', env.GIT_BRANCH)
      return undefined
    }
    return sha
  } catch (error: any) {
    debug('Git remote error: ', error.message)
    return undefined
  }
}
